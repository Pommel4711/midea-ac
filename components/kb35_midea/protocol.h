// Midea frame helpers derived from the MIT-licensed reneklootwijk/midea-uart
// project. See THIRD_PARTY_NOTICES.md for the retained copyright notice.
#pragma once

#include <cstddef>
#include <cstdint>
#include <vector>

namespace esphome::kb35_midea {

constexpr uint8_t KB35_PREAMBLE = 0xAA;
constexpr uint8_t KB35_APPLIANCE_TYPE = 0xAC;

uint8_t midea_crc8(const uint8_t *frame, size_t size);
uint8_t midea_checksum(const uint8_t *frame, size_t size);
bool validate_midea_frame(const std::vector<uint8_t> &frame);
void finish_midea_frame(std::vector<uint8_t> *frame, uint8_t message_id);

}  // namespace esphome::kb35_midea
