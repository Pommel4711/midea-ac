"""ESPHome code generation for the separate KB35 percentage fan entity."""

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import fan
from esphome.const import CONF_ID

from .climate import KB35MideaClimate, KB35MideaFan

DEPENDENCIES = ["kb35_midea"]
CONF_KB35_ID = "kb35_id"

CONFIG_SCHEMA = fan.fan_schema(KB35MideaFan).extend(
    {
        cv.GenerateID(): cv.declare_id(KB35MideaFan),
        cv.Required(CONF_KB35_ID): cv.use_id(KB35MideaClimate),
    }
)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await fan.register_fan(var, config)
    parent = await cg.get_variable(config[CONF_KB35_ID])
    cg.add(var.set_parent(parent))
    cg.add(parent.set_fan(var))
