import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronHelper } from 'src/common/utils/helper.service';
import { DashboardService } from 'src/services/dashboard.service';

@Injectable()
export class CronService {
  constructor(private readonly cronHelper: CronHelper,) {} 
  @Cron(`30 5 * * * `) 

  async cronJob() {
    if (process.env.ENABLE_CRON_JOBS === 'false') return;
    try {
      console.log('Cron job executed!');
      await this.cronHelper.cronFunction();
    } catch (error) {
      console.error('Error in the cron job:', error);
    }
  };



  @Cron('0 * * * *') 
  async cronJobForTransaction() {
    if (process.env.ENABLE_CRON_JOBS === 'false') return;
    try {

      await this.cronHelper.cronJobForTransaction();

    } catch (error) {
      console.error('Error in the cron job:', error);
    }
  }

  @Cron('* * * * *')
  async cronJobForGajraGro() {
    if (process.env.ENABLE_CRON_JOBS === 'false') return;
    try {
      console.log("add new User")
      await this.cronHelper.insertManyUsers();
      await this.cronHelper.bulkCustomerInsert();
      await this.cronHelper.checkCashfreeOrderStatus();
    } catch (error) {
      console.error('Error in the cron job:', error);
    }
  }
}

