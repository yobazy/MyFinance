from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class Account(models.Model):
    bank = models.CharField(max_length=100)  # e.g., TD, Amex
    name = models.CharField(max_length=100)  # e.g., "Credit Card 1", "Debit Card"
    
    class Meta:
        unique_together = ("bank", "name")  # Ensures each account is unique per bank

    def __str__(self):
        return f"{self.bank} - {self.name}"
       
class Transaction(models.Model):
    date = models.DateField()
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=50)  # e.g., TD, Amex
    account = models.ForeignKey(Account, on_delete=models.CASCADE)  # Link to Account

    def __str__(self):
        return f"{self.date} - {self.description} - {self.amount}"

class TDTransaction(models.Model):
    date = models.DateField()
    charge_name = models.TextField()
    credit_amt = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    debit_amt = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'td'

class AmexTransaction(models.Model):
    date = models.DateField()
    date_processed = models.DateField()
    description = models.TextField()
    cardmember = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    exc_rate = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    merchant = models.TextField()

    class Meta:
        db_table = 'amex'
