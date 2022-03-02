const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.json());

const customers = [];

function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find(
    customer => customer.cpf === cpf
  );

  if (!customer) {
    return response.status(400).json({ error: "Customer not found!" });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((balance, operation) => {
    if (operation.type === 'credit') {
      return balance + operation.amount;
    } else {
      return balance - operation.amount;
    }
  }, 0)

  return balance;
}

/*=============================*/
/*========== Account ==========*/
/*=============================*/

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    customer => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response
      .status(400)
      .json({ error: "Customer already exists!" })
  }

  const newAccount = {
    id: uuidv4(),
    name,
    cpf,
    statement: []
  }
  customers.push(newAccount)

  return response.status(201).send();
});

app.use(verifyIfExistsAccountCPF);

app.get('/account', (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.put('/account', (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  return response.status(201).send();
});

app.delete('/account', (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

/*==============================*/
/*========= Operations =========*/
/*==============================*/

app.post('/deposit', (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const depositOperation = {
    description,
    amount,
    type: 'credit',
    created_at: new Date()
  }

  customer.statement.push(depositOperation);

  return response.status(201).send();
});

app.post('/withdraw', (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" })
  }

  const withdrawOperation = {
    amount,
    type: 'debit',
    created_at: new Date()
  }

  customer.statement.push(withdrawOperation);

  return response.status(201).send();
});

/*=============================*/
/*========= Statement =========*/
/*=============================*/

app.get('/statement', (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.get('/statement/date', (request, response) => {
  const { date } = request.query;
  const { customer } = request;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    operation => 
      operation.created_at.toDateString() === new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

app.get('/balance', (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
});

app.listen(3333);