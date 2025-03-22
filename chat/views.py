from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.core.serializers import serialize
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.db.models import Q
from .models import Room, Message, SystemUsers
from .utils import getChatGroup, updateSystemUser, clearChat, clearGroupChat, getRecord


@login_required
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


@login_required
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
    


def clearChat(req, groupname):
    if req.method == 'POST':
        try:
            room = Room.objects.get(Q(room_name=groupname)|Q(description=groupname))
        except Exception as e:
            print('clearChat-Error:', e)
            return HttpResponse('An error occured')
        
        clearGroupChat(room.id)
        print('clearChat: Messages cleared successfully')
        return HttpResponse('messages cleared')

    print('Request must be by POST. Messages not cleared')
    return HttpResponse('Messages not cleared')



def handleUserDisconnect(req, username):
    print(f'User, "{username}" has disconnected', req.user)
    updateSystemUser(username, 'offline')
    clearChat(username)
    logout(req)
    return HttpResponse(f'User, "{username}" has disconnected')
    
