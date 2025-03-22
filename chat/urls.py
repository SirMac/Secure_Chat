from django.urls import path
from .views import index, chatRoom, getChat, handleUserDisconnect, clearChat

app_name = 'chat'

urlpatterns = [
    path("<str:username>/", index, name="index"),
    path("chat/<str:username>/", chatRoom, name="chatRoom"),
    path("chats/<str:groupname>/", getChat, name="getChat"),
    path("chat/<str:groupname>/clear/", clearChat, name="clearChat"),
    path("user/<str:username>/", handleUserDisconnect, name="userDisconnect"),
]
