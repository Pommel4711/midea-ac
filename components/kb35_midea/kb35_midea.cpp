// Kältebringer KB35 Midea UART ESPHome component.
// Protocol framing and status semantics are derived from the MIT-licensed
// reneklootwijk/midea-uart project; see THIRD_PARTY_NOTICES.md.
#include "kb35_midea.h"

#include <algorithm>
#include <cmath>
#include <cstring>

#include "esphome/core/helpers.h"
#include "esphome/core/log.h"

#include "protocol.h"

namespace esphome::kb35_midea {

static const char *const TAG = "kb35_midea";

void KB35MideaFan::setup() {
  this->traits_ = fan::FanTraits(false, true, false, 100);
  this->set_supported_preset_modes({"Auto"});
}

void KB35MideaFan::dump_config() { LOG_FAN("  ", "KB35 Midea Fan", this); }

fan::FanTraits KB35MideaFan::get_traits() {
  this->wire_preset_modes_(this->traits_);
  return this->traits_;
}

void KB35MideaFan::publish_from_parent(uint8_t fan_speed) {
  if (fan_speed == KB35MideaClimate::MIDEA_FAN_AUTO) {
    this->state = true;
    this->speed = 100;
    this->set_preset_mode_("Auto");
  } else {
    this->state = fan_speed > 0;
    this->speed = std::min<int>(fan_speed, 100);
    this->clear_preset_mode_();
  }
  this->publish_state();
}

void KB35MideaFan::control(const fan::FanCall &call) {
  if (this->parent_ == nullptr) return;
  if (call.has_preset_mode()) {
    this->parent_->set_fan_speed(KB35MideaClimate::MIDEA_FAN_AUTO);
    return;
  }
  if (call.get_speed().has_value()) {
    // Home Assistant uses 0 % for an explicitly stopped fan. It is distinct
    // from the KB35's 102 (= automatic) fan setting.
    this->parent_->set_fan_speed(static_cast<uint8_t>(std::clamp(*call.get_speed(), 0, 100)));
    return;
  }
  if (call.get_state().has_value() && !*call.get_state()) this->parent_->set_fan_speed(0);
}

void KB35MideaClimate::setup() {
  this->reset_rx_();
  this->check_uart_settings(9600, 1, uart::UART_CONFIG_PARITY_NONE, 8);
  this->mode = climate::CLIMATE_MODE_OFF;
  this->fan_mode = climate::CLIMATE_FAN_AUTO;
  this->target_temperature = 24.0f;
  this->swing_mode = climate::CLIMATE_SWING_OFF;
  if (this->communication_sensor_ != nullptr) this->communication_sensor_->publish_state(false);
  this->queue_status_request_();
}

void KB35MideaClimate::dump_config() {
  ESP_LOGCONFIG(TAG, "KB35 Midea UART:");
  LOG_CLIMATE("  ", "Climate", this);
  ESP_LOGCONFIG(TAG, "  Protocol version: 0x%02X", this->protocol_version_);
  ESP_LOGCONFIG(TAG, "  UART: 9600 8N1 required by the KB35");
  if (this->fan_ != nullptr) this->fan_->dump_config();
}

climate::ClimateTraits KB35MideaClimate::traits() {
  auto traits = climate::ClimateTraits();
  traits.add_feature_flags(climate::CLIMATE_SUPPORTS_CURRENT_TEMPERATURE);
  traits.add_supported_mode(climate::CLIMATE_MODE_OFF);
  traits.add_supported_mode(climate::CLIMATE_MODE_HEAT_COOL);
  traits.add_supported_mode(climate::CLIMATE_MODE_COOL);
  traits.add_supported_mode(climate::CLIMATE_MODE_DRY);
  traits.add_supported_mode(climate::CLIMATE_MODE_HEAT);
  traits.add_supported_mode(climate::CLIMATE_MODE_FAN_ONLY);
  // These modes are presented by Home Assistant's native climate dialog. For
  // exact 0–100 % control, the linked native fan entity is used instead.
  traits.add_supported_fan_mode(climate::CLIMATE_FAN_OFF);
  traits.add_supported_fan_mode(climate::CLIMATE_FAN_AUTO);
  traits.add_supported_fan_mode(climate::CLIMATE_FAN_LOW);
  traits.add_supported_fan_mode(climate::CLIMATE_FAN_MEDIUM);
  traits.add_supported_fan_mode(climate::CLIMATE_FAN_HIGH);
  traits.add_supported_swing_mode(climate::CLIMATE_SWING_OFF);
  traits.add_supported_swing_mode(climate::CLIMATE_SWING_VERTICAL);
  traits.add_supported_swing_mode(climate::CLIMATE_SWING_HORIZONTAL);
  traits.add_supported_swing_mode(climate::CLIMATE_SWING_BOTH);
  return traits;
}

void KB35MideaClimate::loop() {
  uint8_t byte;
  while (this->available() > 0 && this->read_byte(&byte)) {
    if (this->rx_frame_.empty()) {
      if (byte != KB35_PREAMBLE) continue;
      this->rx_frame_.push_back(byte);
      continue;
    }
    this->rx_frame_.push_back(byte);
    if (this->rx_frame_.size() == 2) {
      this->rx_expected_ = static_cast<uint8_t>(this->rx_frame_[1] + 1U);
      if (this->rx_expected_ < 13 || this->rx_expected_ > MAX_FRAME_SIZE) {
        ESP_LOGD(TAG, "Discarding invalid frame length %u", this->rx_expected_);
        this->reset_rx_();
      }
      continue;
    }
    if (this->rx_expected_ > 0 && this->rx_frame_.size() == this->rx_expected_) {
      auto frame = this->rx_frame_;
      this->reset_rx_();
      this->process_frame_(frame);
    }
  }
}

void KB35MideaClimate::update() {
  if (!this->awaiting_response_) this->queue_status_request_();
}

void KB35MideaClimate::control(const climate::ClimateCall &call) {
  if (!this->ready_for_control_("Klimaänderung")) return;
  bool changed = false;
  if (call.get_mode().has_value()) {
    this->set_mode_(*call.get_mode());
    changed = true;
  }
  if (call.get_target_temperature().has_value()) {
    const int temperature = std::clamp(static_cast<int>(std::lround(*call.get_target_temperature())), 16, 30);
    this->status_[2] = static_cast<uint8_t>((this->status_[2] & 0xE0U) | (temperature - 16));
    changed = true;
  }
  if (call.get_fan_mode().has_value()) {
    changed = this->set_native_fan_mode_(*call.get_fan_mode()) || changed;
  }
  if (call.get_swing_mode().has_value()) {
    this->set_swing_(*call.get_swing_mode());
    changed = true;
  }
  if (changed) this->queue_set_status_();
}

void KB35MideaClimate::set_fan_speed(uint8_t fan_speed) {
  if (!this->ready_for_control_("Lüfter")) return;
  this->status_[3] = fan_speed == MIDEA_FAN_AUTO ? MIDEA_FAN_AUTO : clamp_fan_(fan_speed);
  this->queue_set_status_();
}

void KB35MideaClimate::set_boost(bool enabled) {
  if (!this->ready_for_control_("Boost")) return;
  if (enabled) {
    this->status_[8] |= 0x20;
    this->status_[10] |= 0x02;
  } else {
    this->status_[8] &= ~0x20;
    this->status_[10] &= ~0x02;
  }
  this->queue_set_status_();
}

void KB35MideaClimate::set_sleep(bool enabled) {
  if (!this->ready_for_control_("Sleep")) return;
  if (enabled) this->status_[10] |= 0x01;
  else this->status_[10] &= ~0x01;
  this->queue_set_status_();
}

void KB35MideaClimate::set_frost(bool enabled) {
  if (!this->ready_for_control_("Frostschutz")) return;
  if (enabled && ((this->status_[2] & 0xE0U) >> 5U) != 4) {
    ESP_LOGW(TAG, "Frostschutz wird nur im Heizmodus aktiviert; Befehl verworfen");
    return;
  }
  if (enabled) this->status_[21] |= 0x80;
  else this->status_[21] &= ~0x80;
  this->queue_set_status_();
}

void KB35MideaClimate::set_power_limit(uint8_t percentage) {
  if (percentage != 50 && percentage != 75 && percentage != 100) {
    ESP_LOGW(TAG, "Ungültige Leistungsbegrenzung: %u", percentage);
    return;
  }
  this->power_limit_ = percentage;
  this->queue_power_limit_();
}

void KB35MideaClimate::reset_rx_() {
  this->rx_frame_.clear();
  this->rx_expected_ = 0;
}

void KB35MideaClimate::process_frame_(const std::vector<uint8_t> &frame) {
  if (!validate_midea_frame(frame)) {
    ESP_LOGD(TAG, "Discarding malformed Midea frame");
    return;
  }
  // KB35 SmartKeys use 0x02 for controller-originated traffic, but captures
  // contain valid 0x00 unsolicited frames. CRC/checksum remain authoritative.
  ESP_LOGD(TAG, "RX: %s", format_hex_pretty(frame.data(), frame.size()).c_str());
  if (frame[9] == 0x05 && frame[10] == 0xA0) {
    ESP_LOGD(TAG, "Echoing required A0 frame");
    this->write_array(frame.data(), frame.size());
    this->flush();
    return;
  }
  if (frame[9] == 0x63) {
    // Network-status reporting is deliberately deferred until verified on the
    // physical KB35; it does not affect climate control.
    ESP_LOGD(TAG, "Received 0x63 network-status request (not required for basic control)");
    return;
  }
  if ((frame[9] == 0x03 || frame[9] == 0x02) && frame[10] == 0xC0) {
    this->process_status_(frame);
    return;
  }
  if (frame[9] == 0x03 && frame[10] == 0xB1 && this->awaiting_response_) {
    this->awaiting_response_ = false;
    this->cancel_timeout("kb35-command-timeout");
    if (this->power_limit_select_ != nullptr) {
      this->power_limit_select_->publish_state(this->power_limit_ == 50 ? "50 %" : this->power_limit_ == 75 ? "75 %" : "Normal");
    }
    this->queue_status_request_();
  }
}

void KB35MideaClimate::process_status_(const std::vector<uint8_t> &frame) {
  const size_t payload_size = frame.size() - 13;  // excludes outer header and id/CRC/checksum
  if (payload_size < 23 || frame[10] != 0xC0) return;
  const size_t count = std::min(this->status_.size(), payload_size);
  std::copy_n(frame.begin() + 10, count, this->status_.begin());
  this->status_valid_ = true;
  this->awaiting_response_ = false;
  this->cancel_timeout("kb35-command-timeout");
  this->publish_state_();
  if (this->pending_set_) {
    this->pending_set_ = false;
    this->queue_set_status_();
  }
}

void KB35MideaClimate::publish_state_() {
  this->mode = this->mode_from_payload_();
  this->fan_mode = this->native_fan_mode_from_payload_();
  this->swing_mode = this->swing_from_payload_();
  this->target_temperature = static_cast<float>((this->status_[2] & 0x0FU) + 16);
  this->current_temperature = static_cast<float>(static_cast<int>(this->status_[11]) - 50) / 2.0f;
  this->action = (this->status_[1] & 0x01U) ? climate::CLIMATE_ACTION_IDLE : climate::CLIMATE_ACTION_OFF;
  if (this->outdoor_temperature_sensor_ != nullptr) {
    this->outdoor_temperature_sensor_->publish_state(static_cast<float>(static_cast<int>(this->status_[12]) - 50) / 2.0f);
  }
  if (this->error_code_sensor_ != nullptr) this->error_code_sensor_->publish_state(this->status_[16]);
  if (this->communication_sensor_ != nullptr) this->communication_sensor_->publish_state(true);
  if (this->fan_ != nullptr) this->fan_->publish_from_parent(this->status_[3] & 0x7FU);
  if (this->boost_switch_ != nullptr) this->boost_switch_->publish_state((this->status_[8] & 0x20U) || (this->status_[10] & 0x02U));
  if (this->sleep_switch_ != nullptr) this->sleep_switch_->publish_state(this->status_[10] & 0x01U);
  if (this->frost_switch_ != nullptr) this->frost_switch_->publish_state(this->status_[21] & 0x80U);
  if (this->power_limit_select_ != nullptr) {
    this->power_limit_select_->publish_state(this->power_limit_ == 50 ? "50 %" : this->power_limit_ == 75 ? "75 %" : "Normal");
  }
  ESP_LOGD(TAG, "KB35 C0: power=%s mode=%u target=%.0f fan=%u swing=0x%02X boost=%s sleep=%s frost=%s",
           (this->status_[1] & 0x01U) ? "ON" : "OFF", (this->status_[2] & 0xE0U) >> 5U,
           this->target_temperature, this->status_[3] & 0x7FU, this->status_[7] & 0x0FU,
           (this->status_[8] & 0x20U) || (this->status_[10] & 0x02U) ? "ON" : "OFF",
           (this->status_[10] & 0x01U) ? "ON" : "OFF", (this->status_[21] & 0x80U) ? "ON" : "OFF");
  this->publish_state();
}

void KB35MideaClimate::queue_status_request_() {
  if (this->awaiting_response_) return;
  std::vector<uint8_t> frame = {
      0xAA, 0x00, 0xAC, 0x00, 0x00, 0x00, 0x00, 0x00, this->protocol_version_, 0x03, 0x41,
      0x81, 0x00, 0xFF, 0x03, 0xFF, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00,
  };
  this->send_frame_(std::move(frame), "GET_STATUS");
}

void KB35MideaClimate::queue_set_status_() {
  if (!this->status_valid_) return;
  if (this->awaiting_response_) {
    this->pending_set_ = true;
    return;
  }
  // KB35 captures use 0x24 (37 bytes) for complete set-status commands.
  std::vector<uint8_t> frame(37, 0x00);
  frame[0] = 0xAA;
  frame[2] = 0xAC;
  frame[8] = this->protocol_version_;
  frame[9] = 0x02;
  frame[10] = 0x40;
  for (size_t index = 1; index <= 22; index++) frame[10 + index] = this->status_[index];
  frame[11] = static_cast<uint8_t>((this->beeper_ ? 0x40 : 0x00) | 0x02 | (this->status_[1] & 0x01U));
  frame[17] = static_cast<uint8_t>(0x30 | (this->status_[7] & 0x0FU));
  this->send_frame_(std::move(frame), "SET_STATUS");
}

void KB35MideaClimate::queue_power_limit_() {
  if (this->awaiting_response_) {
    this->pending_set_ = true;
    return;
  }
  std::vector<uint8_t> frame = {
      0xAA, 0x00, 0xAC, 0x00, 0x00, 0x00, 0x00, 0x00, this->protocol_version_, 0x02,
      0xB0, 0x02, 0x48, 0x00, 0x01, this->power_limit_, 0x1A, 0x00, 0x01, 0x00, 0x00, 0x00,
  };
  this->send_frame_(std::move(frame), "SET_GEAR");
}

void KB35MideaClimate::send_frame_(std::vector<uint8_t> frame, const char *kind) {
  finish_midea_frame(&frame, this->message_id_++);
  ESP_LOGD(TAG, "TX %s: %s", kind,
           format_hex_pretty(frame.data(), frame.size()).c_str());
  this->write_array(frame.data(), frame.size());
  this->flush();
  this->awaiting_response_ = true;
  this->set_timeout("kb35-command-timeout", 2000, [this]() { this->command_timed_out_(); });
}

void KB35MideaClimate::command_timed_out_() {
  if (!this->awaiting_response_) return;
  ESP_LOGW(TAG, "Keine KB35-Antwort innerhalb von 2 Sekunden");
  this->awaiting_response_ = false;
  if (this->communication_sensor_ != nullptr) this->communication_sensor_->publish_state(false);
  if (this->pending_set_) {
    this->pending_set_ = false;
    this->queue_set_status_();
  }
}

bool KB35MideaClimate::ready_for_control_(const char *feature) {
  if (this->status_valid_) return true;
  ESP_LOGW(TAG, "%s erst nach einem gültigen C0-Status möglich; Status wird abgefragt", feature);
  this->queue_status_request_();
  return false;
}

void KB35MideaClimate::set_mode_(climate::ClimateMode mode) {
  if (mode == climate::CLIMATE_MODE_OFF) {
    this->status_[1] &= ~0x01;
    return;
  }
  this->status_[1] |= 0x01;
  uint8_t midea_mode = 1;
  switch (mode) {
    case climate::CLIMATE_MODE_HEAT_COOL: midea_mode = 1; break;
    case climate::CLIMATE_MODE_COOL: midea_mode = 2; break;
    case climate::CLIMATE_MODE_DRY: midea_mode = 3; break;
    case climate::CLIMATE_MODE_HEAT: midea_mode = 4; break;
    case climate::CLIMATE_MODE_FAN_ONLY: midea_mode = 5; break;
    default: break;
  }
  this->status_[2] = static_cast<uint8_t>((this->status_[2] & 0x1FU) | (midea_mode << 5U));
}

climate::ClimateMode KB35MideaClimate::mode_from_payload_() const {
  if (!(this->status_[1] & 0x01U)) return climate::CLIMATE_MODE_OFF;
  switch ((this->status_[2] & 0xE0U) >> 5U) {
    case 1: return climate::CLIMATE_MODE_HEAT_COOL;
    case 2: return climate::CLIMATE_MODE_COOL;
    case 3: return climate::CLIMATE_MODE_DRY;
    case 4: return climate::CLIMATE_MODE_HEAT;
    case 5: return climate::CLIMATE_MODE_FAN_ONLY;
    default: return climate::CLIMATE_MODE_HEAT_COOL;
  }
}

bool KB35MideaClimate::set_native_fan_mode_(climate::ClimateFanMode mode) {
  switch (mode) {
    case climate::CLIMATE_FAN_OFF:
      this->status_[3] = 0;
      return true;
    case climate::CLIMATE_FAN_AUTO:
      this->status_[3] = MIDEA_FAN_AUTO;
      return true;
    case climate::CLIMATE_FAN_LOW:
      this->status_[3] = 25;
      return true;
    case climate::CLIMATE_FAN_MEDIUM:
      this->status_[3] = 50;
      return true;
    case climate::CLIMATE_FAN_HIGH:
      this->status_[3] = 100;
      return true;
    default:
      ESP_LOGW(TAG, "Nicht unterstützter Klima-Lüftermodus");
      return false;
  }
}

climate::ClimateFanMode KB35MideaClimate::native_fan_mode_from_payload_() const {
  const uint8_t speed = this->status_[3] & 0x7FU;
  if (speed == 0) return climate::CLIMATE_FAN_OFF;
  if (speed == MIDEA_FAN_AUTO) return climate::CLIMATE_FAN_AUTO;
  if (speed <= 33) return climate::CLIMATE_FAN_LOW;
  if (speed <= 66) return climate::CLIMATE_FAN_MEDIUM;
  return climate::CLIMATE_FAN_HIGH;
}

void KB35MideaClimate::set_swing_(climate::ClimateSwingMode swing) {
  switch (swing) {
    case climate::CLIMATE_SWING_VERTICAL: this->status_[7] = (this->status_[7] & 0xF0U) | 0x0C; break;
    case climate::CLIMATE_SWING_HORIZONTAL: this->status_[7] = (this->status_[7] & 0xF0U) | 0x03; break;
    case climate::CLIMATE_SWING_BOTH: this->status_[7] = (this->status_[7] & 0xF0U) | 0x0F; break;
    default: this->status_[7] &= 0xF0U; break;
  }
}

climate::ClimateSwingMode KB35MideaClimate::swing_from_payload_() const {
  switch (this->status_[7] & 0x0FU) {
    case 0x0C: return climate::CLIMATE_SWING_VERTICAL;
    case 0x03: return climate::CLIMATE_SWING_HORIZONTAL;
    case 0x0F: return climate::CLIMATE_SWING_BOTH;
    default: return climate::CLIMATE_SWING_OFF;
  }
}

uint8_t KB35MideaClimate::clamp_fan_(uint8_t speed) { return std::min<uint8_t>(speed, 100); }

}  // namespace esphome::kb35_midea
