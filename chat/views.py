from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.core.serializers import serialize
from .models import Room, Message, SystemUsers
from .utils import updateSystemUser, getChatGroup
import json
# Create your views here.


def loginUser(request):
    if request.method == "POST":
        username = request.POST["username"]
        # try:
        #     existing_room = Room.objects.get(room_name__icontains=room)
        # except Room.DoesNotExist:
        #     r = Room.objects.create(room_name=room)
        updateSystemUser(username, 'online')
        return redirect("chat:index", username=username)
    return render(request, "login.html")


def index(req, username):
    onlineUsers = SystemUsers.objects.filter(status='online').exclude(username=username)
    context = {
        "username": username,
        "onlineUsers": onlineUsers,
        'pageOptions':{
            'page':'index', 
            'buttonLabel':'View', 
            'header':'Online Users',
            'index': 'active-menu'
        }
    }
    return render(req, "index.html", context)


def chatRoom(request, username):
    partner = request.GET.get('connectwith')
    if not partner:
        return redirect("chat:index", username=username)
    
    room_name = getChatGroup(username, partner)
    
    existing_room = Room.objects.get(room_name__icontains=room_name)
    get_messages = Message.objects.filter(room=existing_room)
    context = {
        "messages": get_messages,
        "username": username,
        "room_name": existing_room.room_name,
        "partner": partner
    }

    return render(request, "room.html", context)


def getChat(request, groupname):
    # print('chats: getrequest', groupname)
    # if request.method == "POST":
    room_name = groupname
    print('groupname:', groupname)
    existing_room = Room.objects.get(room_name__icontains=room_name)
    messages = Message.objects.filter(room=existing_room)
    messageDump = serialize('json', messages)
    return HttpResponse(messageDump)
    