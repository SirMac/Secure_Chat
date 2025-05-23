from .models import SystemUsers, Room, Message
from django.contrib.auth.models import User
from django.db.models import Q

def updateSystemUser(username, status):
    if not username or not status:
        return None
    
    username = username.lower()
    user = getRecord(User, {'username':username})
    if len(user) == 0:
        return 
    
    systemUser = SystemUsers.objects.filter(username=username)
    
    if len(systemUser) == 0:
        print(f'updateSystemUser: Username "{username}" added to systemuser')
        SystemUsers.objects.create(username=username, status=status)
        return
    
    systemUser = systemUser[0]
    systemUser.status = status
    systemUser.save()


def hasLoggedOut(username):
    systemUser = getRecord(SystemUsers, {'username':username,'status':'online'})
    
    if systemUser[0]:
        return True
    
    return False


def createChatGroup(user1, user2):
    groupName = f'{user1.lower()}_{user2.lower()}'
    groupName2 = f'{user2.lower()}_{user1.lower()}'
    Room.objects.create(room_name=groupName, description=groupName2, status='active')
    return groupName


def getChatGroup(user1, user2):
    groupName = f'{user1.lower()}_{user2.lower()}'
    group = Room.objects.filter(Q(room_name=groupName)|Q(description=groupName))

    if len(group) == 0:
        return createChatGroup(user1, user2)
    
    return group[0]



def clearChat(username):
    try:
        msg_to_delete = Message.objects.filter(Q(sender=username)|Q(receiver=username))
    except Exception as e:
        return print('clearChat Error: ', e)

    if len(msg_to_delete) > 0:
        msg_to_delete.delete()
    return


def clearGroupChat(roomid):
    try:
        msg_to_delete = Message.objects.filter(room_id=roomid)
    except Exception as e:
        return print('clearChat Error: ', e)

    if len(msg_to_delete) > 0:
        msg_to_delete.delete()
    return






def toInt(str):
    try:
        num = int(str)
    except:
        return 0
    else:
        return num



def getAllRecords(model):
    try:
        record = model.objects.all()
    except (KeyError, model.DoesNotExist):
        return None
    else:
        return record



def getRecord(model, filterKwargs):
    if not filterKwargs:
        return None
    
    try:
        record = model.objects.filter(**filterKwargs)
    except Exception as e:
        print('getRecord-Error: ', e)
        return None
    else:
        return record



def getRecordByPk(model, id):
    try:
        record = model.objects.get(pk=id)
    except (KeyError, model.DoesNotExist):
        print('getRecordByPk: model does not exist')
        return None
    else:
        return record

