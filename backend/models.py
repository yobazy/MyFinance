from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name
        
class Transaction(models.Model):
    date = models.DateField()
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=10)
    merchant = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'all_transactions'

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
