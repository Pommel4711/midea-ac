"""KB35 Midea UART external component.

The component is intentionally package-first: it is loaded with ESPHome's
``external_components`` mechanism and works with ESP-IDF only. The wire
protocol implementation lives in the climate platform module.
"""

CODEOWNERS = ["@Philipp"]
AUTO_LOAD = ["climate", "fan", "uart", "sensor", "binary_sensor", "switch", "select"]
