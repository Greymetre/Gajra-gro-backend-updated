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

  // Full product price sync to SFA once a day; every change is already pushed right away
  @Cron('0 2 * * *')
  async cronJobForSfaProductPrices() {
    if (process.env.ENABLE_CRON_JOBS === 'false') return;
    try {
      console.log('SFA product price sync', await this.cronHelper.syncProductPricesToSfa());
    } catch (error) {
      console.error('Error in the cron job:', error);
    }
  }

  // New / changed SFA countries, states, districts and cities every 5 minutes (first run after a restart is full)
  @Cron('*/5 * * * *')
  async cronJobForSfaLocations() {
    if (process.env.ENABLE_CRON_JOBS === 'false') return;
    try {
      console.log('SFA location sync', JSON.stringify(await this.cronHelper.syncLocationsFromSfa()));
    } catch (error) {
      console.error('Error in the cron job:', error);
    }
  }

  // Full location re-sync once a day, so renames also reach child records
  @Cron('30 2 * * *')
  async cronJobForSfaLocationsFull() {
    if (process.env.ENABLE_CRON_JOBS === 'false') return;
    try {
      console.log('SFA location full sync', JSON.stringify(await this.cronHelper.syncLocationsFromSfa(true)));
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

