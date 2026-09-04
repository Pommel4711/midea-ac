// Kältebringer KB35 Midea UART ESPHome component.
// SPDX-License-Identifier: MIT
#pragma once

#include <array>
#include <cstdint>
#include <vector>

#include "esphome/components/binary_sensor/binary_sensor.h"
#include "esphome/components/climate/climate.h"
#include "esphome/components/fan/fan.h"
#include "esphome/components/select/select.h"
#include "esphome/components/sensor/sensor.h"
#include "esphome/components/switch/switch.h"
#include "esphome/components/uart/uart.h"
#include "esphome/core/component.h"

namespace esphome::kb35_midea {

class KB35MideaClimate;

class KB35MideaFan final : public Component, public fan::Fan {
 public:
  void set_parent(KB35MideaClimate *parent) { this->parent_ = parent; }
  void setup() override;
  void dump_config() override;
  fan::FanTraits get_traits() override;
  void publish_from_parent(uint8_t fan_speed);

 protected:
  void control(const fan::FanCall &call) override;
  KB35MideaClimate *parent_{nullptr};
  fan::FanTraits traits_;
};

class KB35MideaClimate final : public climate::Climate, public uart::UARTDevice, public PollingComponent {
 public:
  static constexpr uint8_t MIDEA_FAN_AUTO = 102;
  void setup() override;
  void loop() override;
  void update() override;
  void dump_config() override;
  climate::ClimateTraits traits() override;
  void control(const climate::ClimateCall &call) override;

  void set_protocol_version(uint8_t version) { this->protocol_version_ = version; }
  void set_fan(KB35MideaFan *fan) { this->fan_ = fan; }
  void set_boost_switch(switch_::Switch *entity) { this->boost_switch_ = entity; }
  void set_sleep_switch(switch_::Switch *entity) { this->sleep_switch_ = entity; }
  void set_frost_switch(switch_::Switch *entity) { this->frost_switch_ = entity; }
  void set_outdoor_temperature_sensor(sensor::Sensor *entity) { this->outdoor_temperature_sensor_ = entity; }
  void set_error_code_sensor(sensor::Sensor *entity) { this->error_code_sensor_ = entity; }
  void set_communication_sensor(binary_sensor::BinarySensor *entity) { this->communication_sensor_ = entity; }
  void set_power_limit_select(select_::Select *entity) { this->power_limit_select_ = entity; }

  void set_fan_speed(uint8_t fan_speed);
  void set_boost(bool enabled);
  void set_sleep(bool enabled);
  void set_frost(bool enabled);
  void set_beeper(bool enabled) { this->beeper_ = enabled; }
  void set_power_limit(uint8_t percentage);

 protected:
  static constexpr size_t MAX_FRAME_SIZE = 96;

  void reset_rx_();
  void process_frame_(const std::vector<uint8_t> &frame);
  void process_status_(const std::vector<uint8_t> &frame);
  void publish_state_();
  void queue_status_request_();
  void queue_set_status_();
  void queue_power_limit_();
  void send_frame_(std::vector<uint8_t> frame, const char *kind);
  void command_timed_out_();
  bool ready_for_control_(const char *feature);
  void set_mode_(climate::ClimateMode mode);
  climate::ClimateMode mode_from_payload_() const;
  bool set_native_fan_mode_(climate::ClimateFanMode mode);
  climate::ClimateFanMode native_fan_mode_from_payload_() const;
  void set_swing_(climate::ClimateSwingMode swing);
  climate::ClimateSwingMode swing_from_payload_() const;
  static uint8_t clamp_fan_(uint8_t speed);

  uint8_t protocol_version_{0x02};
  uint8_t message_id_{0x04};
  uint8_t rx_expected_{0};
  bool awaiting_response_{false};
  bool pending_set_{false};
  bool beeper_{false};
  bool status_valid_{false};
  uint8_t power_limit_{100};
  std::vector<uint8_t> rx_frame_;
  // C0 begins at index 0. Its following bytes are preserved for later 0x40
  // commands so unrelated appliance state is never reset to guessed defaults.
  std::array<uint8_t, 29> status_{};

  KB35MideaFan *fan_{nullptr};
  switch_::Switch *boost_switch_{nullptr};
  switch_::Switch *sleep_switch_{nullptr};
  switch_::Switch *frost_switch_{nullptr};
  sensor::Sensor *outdoor_temperature_sensor_{nullptr};
  sensor::Sensor *error_code_sensor_{nullptr};
  binary_sensor::BinarySensor *communication_sensor_{nullptr};
  select_::Select *power_limit_select_{nullptr};
};

}  // namespace esphome::kb35_midea
