import asyncio
import websockets
import json
import random
import time
import sys

async def simulate_player(quiz_code, username, delay):
    await asyncio.sleep(delay)
    uri = f"ws://127.0.0.1:8000/ws/{quiz_code}/{username}"
    try:
        async with websockets.connect(uri, ping_interval=None, ping_timeout=None) as websocket:
            print(f"[+] {username} connected to {quiz_code} waiting room.")
            
            while True:
                response = await websocket.recv()
                data = json.loads(response)
                
                # If question drops
                if data.get("phase") == 2:
                    options = data.get("options", [])
                    if not options:
                        continue
                        
                    question_id = data.get("question_id")
                    duration = data.get("duration", 10)
                    
                    # Random "thinking" time before submitting answer
                    think_time = random.uniform(1.0, duration - 1.0)
                    await asyncio.sleep(think_time)
                    
                    # Pick a random answer
                    chosen = random.choice(options)["id"]
                    
                    answer_payload = {
                        "action": "submit_answer",
                        "option_ids": [chosen],
                        "timestamp": time.time()
                    }
                    
                    await websocket.send(json.dumps(answer_payload))
                    print(f"[*] {username} submitted option {chosen} after {think_time:.2f}s")
                    
                # Handle end of quiz
                elif data.get("phase") == 6:
                    print(f"[-] {username} finished quiz.")
                    break
                    
    except Exception as e:
        print(f"[!] {username} disconnected or error: {e}")

async def main():
    if len(sys.argv) < 3:
        print("Usage: python sim_clients.py <QUIZ_CODE> <NUM_BOTS>")
        return
        
    quiz_code = sys.argv[1]
    num_bots = int(sys.argv[2])
    
    print(f"Spawning {num_bots} simulated bots for quiz #{quiz_code}...")
    
    tasks = []
    for i in range(num_bots):
        # Stagger connections cleanly to avoid blocking synchronous DB adds
        delay = i * 1.5
        bot_name = f"Bot_Parallel_{i+1}"
        tasks.append(asyncio.create_task(simulate_player(quiz_code, bot_name, delay)))
        
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
