"""ESPHome code generation for the Kältebringer KB35 Midea climate platform."""

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import binary_sensor, climate, fan, select, sensor, switch, text_sensor, uart
from esphome.const import CONF_ID

DEPENDENCIES = ["uart"]
AUTO_LOAD = ["climate", "fan", "sensor", "binary_sensor", "switch", "select"]

CONF_PROTOCOL_VERSION = "protocol_version"
CONF_FAN = "fan"
CONF_BOOST_SWITCH = "boost_switch"
CONF_SLEEP_SWITCH = "sleep_switch"
CONF_FROST_SWITCH = "frost_switch"
CONF_INDOOR_TEMPERATURE = "indoor_temperature"
CONF_OUTDOOR_TEMPERATURE = "outdoor_temperature"
CONF_ERROR_CODE = "error_code"
CONF_COMMUNICATION = "communication"
CONF_POWER_LIMIT_SELECT = "power_limit_select"
CONF_LAST_TX_FRAME = "last_tx_frame"
CONF_LAST_RX_FRAME = "last_rx_frame"
CONF_TRANSPORT_STATUS = "transport_status"

kb35_midea_ns = cg.esphome_ns.namespace("kb35_midea")
KB35MideaClimate = kb35_midea_ns.class_(
    "KB35MideaClimate", climate.Climate, uart.UARTDevice, cg.PollingComponent
)
KB35MideaFan = kb35_midea_ns.class_("KB35MideaFan", fan.Fan, cg.Component)

CONFIG_SCHEMA = (
    climate.climate_schema(KB35MideaClimate)
    .extend(
        {
            cv.GenerateID(): cv.declare_id(KB35MideaClimate),
            cv.Optional(CONF_PROTOCOL_VERSION, default=2): cv.int_range(min=0, max=255),
            cv.Optional(CONF_FAN): cv.use_id(KB35MideaFan),
            cv.Optional(CONF_BOOST_SWITCH): cv.use_id(switch.Switch),
            cv.Optional(CONF_SLEEP_SWITCH): cv.use_id(switch.Switch),
            cv.Optional(CONF_FROST_SWITCH): cv.use_id(switch.Switch),
            cv.Optional(CONF_INDOOR_TEMPERATURE): cv.use_id(sensor.Sensor),
            cv.Optional(CONF_OUTDOOR_TEMPERATURE): cv.use_id(sensor.Sensor),
            cv.Optional(CONF_ERROR_CODE): cv.use_id(sensor.Sensor),
            cv.Optional(CONF_COMMUNICATION): cv.use_id(binary_sensor.BinarySensor),
            cv.Optional(CONF_POWER_LIMIT_SELECT): cv.use_id(select.Select),
            cv.Optional(CONF_LAST_TX_FRAME): cv.use_id(text_sensor.TextSensor),
            cv.Optional(CONF_LAST_RX_FRAME): cv.use_id(text_sensor.TextSensor),
            cv.Optional(CONF_TRANSPORT_STATUS): cv.use_id(text_sensor.TextSensor),
        }
    )
    .extend(uart.UART_DEVICE_SCHEMA)
    .extend(cv.polling_component_schema("2s"))
)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await uart.register_uart_device(var, config)
    await climate.register_climate(var, config)
    cg.add(var.set_protocol_version(config[CONF_PROTOCOL_VERSION]))

    setters = {
        CONF_FAN: "set_fan",
        CONF_BOOST_SWITCH: "set_boost_switch",
        CONF_SLEEP_SWITCH: "set_sleep_switch",
        CONF_FROST_SWITCH: "set_frost_switch",
        CONF_INDOOR_TEMPERATURE: "set_indoor_temperature_sensor",
        CONF_OUTDOOR_TEMPERATURE: "set_outdoor_temperature_sensor",
        CONF_ERROR_CODE: "set_error_code_sensor",
        CONF_COMMUNICATION: "set_communication_sensor",
        CONF_POWER_LIMIT_SELECT: "set_power_limit_select",
        CONF_LAST_TX_FRAME: "set_last_tx_frame_sensor",
        CONF_LAST_RX_FRAME: "set_last_rx_frame_sensor",
        CONF_TRANSPORT_STATUS: "set_transport_status_sensor",
    }
    for key, setter in setters.items():
        if key in config:
            entity = await cg.get_variable(config[key])
            cg.add(getattr(var, setter)(entity))
