from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.contrib.messages import error
from django.db.utils import OperationalError
import logging


def handleDBConnectionError(func):
    def inner_function(req, *args, **kwargs):
        try:
            return func(req, *args, **kwargs)
        except OperationalError as e:
            logging.error(f'OperationalError: {e}')
            error(request=req, message='Database connection error')
            return redirect(req.path)
    return inner_function


def loggedIn(func):
    def inner_function(req, *args, **kwargs):
        print(req.user.username)
        if not req.user.is_authenticated:
            return func(req, *args, **kwargs)
        return redirect('chat:index', username=req.user)
    return inner_function


def isUserRegistered(username):
    try:
        User.objects.get(username=username)
    except (KeyError, User.DoesNotExist):
       return False
    else:
       return True




def isUserActive(username):
    try:
        user = User.objects.get(username=username)
    except (KeyError, User.DoesNotExist):
       return False
    else:
       if user.is_active == 0:
            return False
       return True




def redirectPageNotFound(req, exception): 
    pass