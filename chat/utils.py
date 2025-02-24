from .models import SystemUsers


def updateSystemUser(username, status):
    if not username or not status:
        return None
    
    print('user:', username)
    user = SystemUsers.objects.filter(username=username)
    
    if len(user) == 0:
        print(f'updateSystemUser: Username "{username}" added to systemuser')
        SystemUsers.objects.create(username=username, status=status)
        return
    
    user = user[0]
    user.status = status
    user.save()









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



def getRecordByPk(model, id):
    try:
        record = model.objects.get(pk=id)
    except (KeyError, model.DoesNotExist):
        print('getRecordByPk: model does not exist')
        return None
    else:
        return record

