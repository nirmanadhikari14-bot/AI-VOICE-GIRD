import asyncio
import websockets

async def test():
    async with websockets.connect('ws://localhost:8000/ws/v1/test') as ws:
        await ws.send('Hello WebSocket')
        response = await ws.recv()
        print("Success:", response)

asyncio.run(test())
