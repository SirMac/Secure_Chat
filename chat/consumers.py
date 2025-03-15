import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        print('...connecting...')
        self.room_name = f"room_{self.scope['url_route']['kwargs']['room_name']}"
        await self.channel_layer.group_add(self.room_name, self.channel_name)

        await self.accept()


    async def disconnect(self, code):
        # print(f'Websocket-disconnect: {self.room_name}, user:{code}')
        await self.channel_layer.group_discard(self.room_name, self.channel_name)
        self.close(code)


    async def receive(self, text_data):
        data_json = json.loads(text_data)
        event = {"type": "send_message", "message": data_json}
        await self.channel_layer.group_send(self.room_name, event)


    async def send_message(self, event):
        data = event["message"]
        if data.get('type') == 'message':
            await self.create_message(data=data)

        await self.send(text_data=json.dumps({"message": data}))

    @database_sync_to_async
    def create_message(self, data):
        get_room = Room.objects.get(room_name=data["room_name"])
        messageType = data.get('type')
        if not messageType:
            messageType = 'message'

        if not Message.objects.filter(
            message=data["message"], sender=data["sender"]
        ).exists():
            new_message = Message.objects.create(
                room=get_room, message=data["message"], 
                sender=data["sender"],
                receiver=data["partner"],
                type=messageType
            )
            return new_message
