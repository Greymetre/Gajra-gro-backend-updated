// import { Injectable } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { CronHelper } from 'src/common/utils/helper.service'; // Update the import path to match the correct location
// import { DashboardService } from 'src/services/dashboard.service';

// @Injectable()
// export class CronService {
//   constructor(private readonly cronHelper: CronHelper) {} // Inject the CronHelper service

//   // @Cron('* * * * * *') // Define your cron schedule here
//   async cronJob() {
//     try {
//        this.cronHelper.cronFunction(); // Use the instance of cronHelper

//       console.log('Cron job executed!');
//       // Your cron job logic here...
//     } catch (error) {
//       console.error('Error in the cron job:', error);
//     }
//   }
// }
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronHelper } from 'src/common/utils/helper.service';
import { DashboardService } from 'src/services/dashboard.service';

@Injectable()
export class CronService {
  constructor(private readonly cronHelper: CronHelper,) {} 
  @Cron(`30 5 * * * `) 

  async cronJob() {
    try {
      console.log('Cron job executed!');
      await this.cronHelper.cronFunction();
    } catch (error) {
      console.error('Error in the cron job:', error);
    }
  };



  @Cron('0 * * * *') 
  async cronJobForTransaction() {
    try {

      await this.cronHelper.cronJobForTransaction();

    } catch (error) {
      console.error('Error in the cron job:', error);
    }
  }

  @Cron('* * * * *')
  async cronJobForGajraGro() {
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

