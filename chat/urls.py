from django.urls import path
from .views import loginUser, index, chatRoom

app_name = 'chat'

urlpatterns = [
    path("login/", loginUser, name="login"),
    path("<str:username>/", index, name="index"),
    path("chat/<str:username>/", chatRoom, name="chatRoom"),
]
