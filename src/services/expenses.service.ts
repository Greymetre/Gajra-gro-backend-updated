import { Injectable } from '@nestjs/common';
import { CreateExpenseDto } from '../user/expenses/dto/create-expense.dto';
import { UpdateExpenseDto } from '../user/expenses/dto/update-expense.dto';
const ObjectId = require('mongoose').Types.ObjectId;

@Injectable()
export class ExpensesService {
  create(createExpenseDto: CreateExpenseDto) {
    return 'This action adds a new expense';
  };

  findAll() {
    return `This action returns all expenses`;
  };

  findOne(id: number) {
    return `This action returns a #${id} expense`;
  };

  update(id: number, updateExpenseDto: UpdateExpenseDto) {
    return `This action updates a #${id} expense`;
  };

  remove(id: number) {
    return `This action removes a #${id} expense`;
  };
}
