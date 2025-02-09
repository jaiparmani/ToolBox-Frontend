import time
import pyautogui
import random
# move my mouse pointer a lot every 10 seconds
def move_mouse():
    while True:
        pyautogui.moveRel(random.choice([+1, -1])*random.randint(1, 1000), 0, duration=random.choice([x/10 for x in range(10)]))  # Move right
        time.sleep(random.randint(1,60))

if __name__ == "__main__":
    move_mouse()