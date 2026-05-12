import uiautomator2 as u2
import time

try:
    print(dir(u2.Device().screenrecord))
except Exception as e:
    print(e)
