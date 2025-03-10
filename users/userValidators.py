from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import logging


class ValidateUser:

    def __init__(self, userData):
        self.errorMessages = []
        self.username = userData['username']
        self.email = userData['email']
        self.password1 = userData['password1']
        self.password2 = userData['password2']
        self.confirmPassword()
        self.validateEmail()

    def confirmPassword(self):
        if self.password1 != self.password2:
            self.errorMessages.append('Passwords do not match')

    def validateEmail(self):
        try:
            validate_email(self.email)
        except ValidationError as e:
            print(str(e))
            self.errorMessages.append('Email address invalid')

    # def checkDuplicate(self):
    #     try:
    #         User.objects.get(email=self.email)
    #     except (KeyError, User.DoesNotExist):
    #         return False
    #     else:
    #         return True

