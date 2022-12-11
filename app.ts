import _ from 'lodash';
import { Component, Inject, Vue } from 'vue-property-decorator';
import AppointmentService from '@/visa-application/services/appointment/appointment.service';
import SchengenService from '@/visa-application/services/schengen/schengen.service';
import { IAppointment, ISelectedSlot, ISlot } from '@/shared/model/appointment.model';
import {
  AFP_LOCKED,
  APPOINTMENT_STEP_SKIP,
  APPOINTMENT_TYPE_NORMAL,
  APPOINTMENT_TYPE_PTA,
  APPOINTMENT_TYPE_PTA_WEEKEND,
  BOOK_APPOINTMENT_ACTION,
  GOOGLE_RECAPTCHA_SITE_KEY,
  INDI_TYPE,
  LOCAL_COUNTRY,
  PENDING_STATUS,
  PTA_SKU,
  PTA_WEEKEND_SKU,
  USE_RECAPTCHANET,
  STAGE_APPOINTMENT,
  TAKE_APPOINTMENT_ACTION,
  APPOINTMENT_LOCK_DURATION_DEFAULT,
  CronJobCancelAppointmentComment,
  ADS_TYPE,
  CANCEL_APPOINTMENT_COMMENT
} from '@/constants';
import { format } from 'date-fns';
import TimePicker from '@/ui/time-picker/time-picker.vue';
import TlsStoreService from '@/shared/config/service/tls-store.service';
import DirectusService from '@/core/directus/directus.service';
import ApplicationAppointmentCMSModel from '@/visa-application/models/ApplicationAppointmentCMSModel';
import LanguageCode from '@/locale/language-code';
import BasketStoreService from '@/shared/config/service/basket-store.service';
import VacAvsCMSModel from '@/visa-application/models/VacAvsCMSModel';
import AvsInBasket from '@/visa-application/models/AvsInBasket';
import ApplicationCenterCMSModel from '@/visa-application/models/ApplicationCenterCMSModel';
import { FormData } from '@/shared/model/form.model';
import { FormGroupStage } from '@/shared/model/form-group.model';
import JhiAlertService from '@/shared/alert/alert.service';
import { VueReCaptcha } from 'vue-recaptcha-v3';
import CaptchaService from '@/visa-application/services/captcha/captcha.service';
import { checkGroupAmendAppointment, getToday } from '@/shared/utils/utils';
import { getLoadedRecaptchaToken, getRecaptchaStatus } from '@/shared/utils/recaptcha';
import ApplicationCenterService from '@/visa-application/services/travelpurpose/application-center/application-center.service';
import { IApplicationCenter } from '@/shared/model/travelpurpose/application-center.model';
import WorkflowIndicatior from '@/core/workflow-indicatior/workflow-indicatior.vue';
import WorkflowIndicatiorStage from '@/shared/model/workflow-indicatior-stage';
import VisaTypeCMSModel from '@/visa-application/models/VisaTypeCMSModel';
import ApplicationFormsCMSModel from '@/visa-application/models/ApplicationFormsCMSModel';
import FormActionDTO from '@/visa-application/services/schengen/dtos/FormActionDTO';

export interface BookAppointmentResponse {
  status: string;
  error?: string;
  message: string;
}

export interface FormGroupStatusHandler {
  fg_id: number;
  variant: string;
  fg_process: string;
  stage: string;
  stage_number: number;
  status: string;
  st_when: string;
  st_who: number;
  fg_count_f_id: number;
  fg_is_anonymised: boolean;
  ug_type: string;
  ug_xref_i_tag: string;
}

@Component({
  components: {
    timePicker: TimePicker,
    workflowIndicatior: WorkflowIndicatior
  }
})
export default class Appointment extends Vue {
  public showPopup = false;
  public showBookErrorPopup = false;
  public checkAppointmentAvailability = false;
  public availableAppointments: IAppointment[] = [];
  public appointmentsToDisplay: IAppointment[] = [];
  public availableAppointmentsPTA: IAppointment[] = [];
  public appointmentsToDisplayPTA: IAppointment[] = [];
  public availableAppointmentsWeekendPTA: IAppointment[] = [];
  public appointmentsToDisplayWeekendPTA: IAppointment[] = [];
  public formsAppointmentDates: Map<number, string> = new Map();
  public indexAppointment = 0;
  public errorMessage: string = null;
  public residenceCountryCode: string;
  public issuer: string;
  public client = LOCAL_COUNTRY;
  public formGroupId: number;
  public timeslot: ISelectedSlot;
  public calendarLimit = 180;
  public currentLanguage: LanguageCode;
  public invalidCaptcha = false;
  public canGroupAmendAppointment = true;
  public skusByForm = [];
  public formGroupAppointmentStatus: string;
  public formGroupAppointmentType: string = APPOINTMENT_TYPE_NORMAL;
  // for COMP handling
  public userType: string;
  public formLimitReachedError = false;
  public applicationAppointmentCMSContent: ApplicationAppointmentCMSModel = new ApplicationAppointmentCMSModel();
  public applicationFormsData: ApplicationFormsCMSModel = new ApplicationFormsCMSModel();
  private unwatchCurrentLanguage: Function;
  public primeTimeAppointmentAvs: VacAvsCMSModel;
  public primeTimeAppointmentWeekendAvs: VacAvsCMSModel;
  private cancelAppointmentComment = CANCEL_APPOINTMENT_COMMENT;
  public forms: FormData[] = [];
  public afpLockPopup = false;
  public afpCancellationPopup = false;
  public APPOINTMENT_TYPE_PTA = APPOINTMENT_TYPE_PTA;
  public APPOINTMENT_TYPE_PTA_WEEKEND = APPOINTMENT_TYPE_PTA_WEEKEND;
  public currentStage = WorkflowIndicatiorStage.APPOINTMENT;
  public paidAlreadyPta = false;
  public paidAlreadyPtaWeekend = false;
  public currentBasketSku = [];
  public formsInTravPurposeList = [];
  public afpLockedStatus = false;
  public showAmendSameTime = false;
  public showAppointmentTerminationPopup = false;
  public showAppointmentLockDurationPopup = false;
  public appointmentLockDuration: number = APPOINTMENT_LOCK_DURATION_DEFAULT;
  private getApplicationCenterInfoPromise: Promise<IApplicationCenter>;
  public applicationCenterInfo: IApplicationCenter;
  public emptyBookingControl = [];
  public cronJobCancelAppointmentComment = CronJobCancelAppointmentComment;
  // ads 空数据提示弹窗
  public isShowADSEmptPopup = false;
  public unavliable = false;
  public standard = false;
  public prime = false;

  @Inject('applicationCenterService') private applicationCenterService: () => ApplicationCenterService;
  @Inject('directusService') private directusService: () => DirectusService;
  @Inject('appointmentService') private appointmentService: () => AppointmentService;
  @Inject('schengenService') private schengenService: () => SchengenService;
  @Inject('tlsStoreService') private tlsStoreService: () => TlsStoreService;
  @Inject('basketStoreService') private basketStoreService: () => BasketStoreService;
  @Inject('alertService') private alertService: () => JhiAlertService;
  @Inject('captchaService') private captchaService: () => CaptchaService;

  public beforeRouteEnter(to, from, next) {
    next(async vm => {
      vm.formGroupId = Number(to.params.formGroupId);
      vm.residenceCountryCode = to.params.residenceCountryCode;
      vm.issuer = to.params.issuer;
      vm.APPOINTMENT_TYPE_PTA = APPOINTMENT_TYPE_PTA;

      if (APPOINTMENT_STEP_SKIP) {
        vm.goToPersonalPage();
      }

      if (getRecaptchaStatus(to.params.residenceCountryCode)) {
        Vue.use(VueReCaptcha, {
          siteKey: GOOGLE_RECAPTCHA_SITE_KEY,
          loaderOptions: {
            useRecaptchaNet: USE_RECAPTCHANET
          }
        });
      }

      vm.getApplicationCenterInfo();
      await vm
        .schengenService()
        .getFormGroupStagesStatuses(LOCAL_COUNTRY, to.params.formGroupId)
        .then((res: FormGroupStage[]) => {
          vm.userType = res[0].ug_type;
          vm.formGroupAppointmentStatus = res.find(x => x.stage === STAGE_APPOINTMENT).status;
        })
        .catch(err => {
          console.error(err);
        });

      checkGroupAmendAppointment(vm.client, vm.issuer, vm.formGroupId)
        .then(res => {
          vm.canGroupAmendAppointment = res;
          if (!res && vm.formGroupAppointmentStatus !== PENDING_STATUS) {
            vm.rollbackApplicationPage();
          }
        })
        .catch(() => {
          vm.canGroupAmendAppointment = false;
        });

      vm.unwatchCurrentLanguage = vm.$store.watch(
        () => vm.$store.getters.currentLanguage,
        currentLanguage => {
          vm.currentLanguage = currentLanguage;
          vm.getContentFromCMS(currentLanguage);
        },
        { immediate: true }
      );
      // Check if the user has paid pta
      vm.schengenService()
        .getFormGroupBasket(vm.issuer, +vm.formGroupId)
        .then(res => {
          const skusOfFormFlatMap = _.flatMap(res, n => _.filter(n, 's_sku'));
          vm.currentBasketSku = skusOfFormFlatMap;
          vm.paidAlreadyPta = _.filter(skusOfFormFlatMap, { paid: true, s_sku: PTA_SKU }).length !== 0;
          vm.paidAlreadyPtaWeekend = _.filter(skusOfFormFlatMap, { paid: true, s_sku: PTA_WEEKEND_SKU }).length !== 0;
        });

      await vm
        .schengenService()
        .getUserForms(vm.issuer, vm.formGroupId)
        // We enable the buttons only if forms for group have been successfully retrieved
        .then(forms => {
          vm.forms = forms;
          // extract property f_id from forms list
          vm.skusByForm = _.map(forms, o => _.pick(o, ['f_id']));
          // add property sku: [] to all objects from the list
          vm.skusByForm = _.map(vm.skusByForm, o => _.assignIn({ skus: [] }, o));
        })
        .catch(error => vm.alertService().showError(error.message));
      vm.checkAppointmentCancelInfo();
      // check afp status
      vm.formsInTravPurposeList = _.map(vm.forms, _.iteratee('f_trav_purpose'));
      vm.checkAFPLocked();

      // get appointment book status,if is n_a,alert afp lock popup,if is book ,alert afp cancel popup
      // TODO: The afp appointment has not been completed yet, it is temporarily disabled
      vm.appointmentService()
        .canBook(LOCAL_COUNTRY, vm.issuer, vm.formGroupId)
        .then(async (res: FormGroupStatusHandler) => {
          if (res.status === 'n_a') {
            vm.afpLockPopup = true;
          } else {
            vm.appointmentService()
              .getFormsAppointmentDates(LOCAL_COUNTRY, vm.issuer, vm.formGroupId)
              .then((result: Map<number, string>) => {
                vm.formsAppointmentDates = result;
              })
              .catch();
            await vm.getFormGroupAppointmentType();
            vm.getAvailableAppointments();
            if (vm.$store.getters.userType === INDI_TYPE) {
              vm.getAvailablePrimeTimeAppointments();
              vm.getAvailablePrimeTimeAppointmentsWeekend();
            }
            vm.findPtaAvs();
            vm.checkAvailability();
          }
        });
    });
  }

  public async getFormGroupAppointmentType(): Promise<void> {
    await this.appointmentService()
      .getGroupAppointmentType(LOCAL_COUNTRY, this.formGroupId)
      .then(
        res => {
          if (res.status === 'success') {
            this.formGroupAppointmentType = _.get(res, 'appointment_type');
          }
        },
        err => {
          if (err.response.status === 412) {
            this.formLimitReachedError = true;
          }
        }
      );
  }

  public findPtaAvs(): void {
    const filter = {
      'vac.code': {
        eq: this.issuer
      },
      'avs.sku': {
        in: [PTA_SKU, PTA_WEEKEND_SKU]
      }
    };

    this.directusService()
      .getCollection<VacAvsCMSModel>(VacAvsCMSModel, 'vac_avs', ['*.*.*'], filter)
      .then((result: VacAvsCMSModel[]) => {
        this.primeTimeAppointmentAvs = result.find(x => x.avs.sku === PTA_SKU);
        this.primeTimeAppointmentWeekendAvs = result.find(x => x.avs.sku === PTA_WEEKEND_SKU);
      })
      .catch(error => console.error(error));
  }

  public beforeDestroy(): void {
    this.unwatchCurrentLanguage();
  }

  public checkAvailability(): void {
    this.applicationCenterService()
      .findByIssuer(this.tlsStoreService().getIssuer())
      .then((applicationCenter: IApplicationCenter) => {
        // if no form  in this group, can delete
        if (this.userType === INDI_TYPE && this.forms.length >= applicationCenter.indiBigGroupLimitation) {
          // add forms to formGroup
          this.checkAppointmentAvailability = true;
        }
      });
  }

  public checkAFPLocked() {
    const filter = {
      'application_center.code': {
        eq: this.issuer
      },
      code: {
        in: this.formsInTravPurposeList
      }
    };
    this.directusService()
      .getCollection<VisaTypeCMSModel>(VisaTypeCMSModel, 'visa_types', ['*', 'translation.*.*'], filter, this.currentLanguage)
      .then((result: VisaTypeCMSModel[]) => {
        // active_afp_payment
        this.afpLockedStatus = _.indexOf(_.map(result, _.iteratee('active_afp_payment')), AFP_LOCKED) !== -1;
      })
      .catch(error => console.error(error));
  }

  public rollbackApplicationPage(): void {
    this.$router.push({
      name: 'Form',
      params: {
        formGroupId: this.formGroupId + '',
        residenceCountryCode: this.residenceCountryCode,
        issuer: this.issuer
      }
    });
  }

  public goToAvsPage(): void {
    this.$router.push({
      name: 'Checkout',
      params: {
        formGroupId: this.formGroupId + '',
        residenceCountryCode: this.residenceCountryCode,
        issuer: this.issuer
      }
    });
  }

  public getContentFromCMS(currentLanguage: LanguageCode): void {
    this.directusService()
      .getCollection<ApplicationAppointmentCMSModel>(
        ApplicationAppointmentCMSModel,
        'application_appointment',
        ['translation.*'],
        undefined,
        currentLanguage
      )
      .then((result: ApplicationAppointmentCMSModel[]) => {
        this.applicationAppointmentCMSContent = result[0];
      })
      .catch(error => {
        console.error(error);
      });

    this.directusService()
      .getCollection<ApplicationCenterCMSModel>(
        ApplicationCenterCMSModel,
        'application_centers',
        ['calendar_limit'],
        { code: { eq: this.issuer } },
        currentLanguage
      )
      .then((result: ApplicationCenterCMSModel[]) => {
        this.calendarLimit = result.length > 0 ? result[0].calendar_limit : this.calendarLimit;
      })
      .catch(error => console.error(error));
  }

  public getAvailableAppointments(): void {
    if (this.formGroupAppointmentType === APPOINTMENT_TYPE_PTA || this.formGroupAppointmentType === APPOINTMENT_TYPE_PTA_WEEKEND) {
      return;
    }
    this.appointmentService()
      .retrieveByAppointmentType(LOCAL_COUNTRY, this.issuer, this.formGroupId, this.formGroupAppointmentType)
      .then(
        res => {
          this.formatAppointments(this.appointmentsFilter(res.data), 'availableAppointments');
        },
        err => {
          if (err.response.status === 412) {
            this.formLimitReachedError = true;
          }
        }
      );
  }

  public getAvailablePrimeTimeAppointments(): void {
    this.appointmentService()
      .retrievePTA(LOCAL_COUNTRY, this.issuer, this.formGroupId)
      .then(
        res => {
          this.formatAppointments(this.appointmentsFilter(res.data), 'availableAppointmentsPTA');
        },
        err => {
          if (err.response.status === 412) {
            this.formLimitReachedError = true;
          }
        }
      );
  }

  public getAvailablePrimeTimeAppointmentsWeekend(): void {
    this.appointmentService()
      .retrieveByAppointmentType(LOCAL_COUNTRY, this.issuer, this.formGroupId, APPOINTMENT_TYPE_PTA_WEEKEND)
      .then(
        res => {
          this.formatAppointments(this.appointmentsFilter(res.data), 'availableAppointmentsWeekendPTA');
        },
        err => {
          if (err.response.status === 412) {
            this.formLimitReachedError = true;
          }
        }
      );
  }

  public bookAppointment(timeslot: ISelectedSlot): void {
    if (
      this.formsAppointmentDates.values().next().value === timeslot.date + ' ' + timeslot.hour &&
      this.formGroupAppointmentType === timeslot.type
    ) {
      this.showAmendSameTime = true;
    } else {
      this.showPopup = true;
      this.errorMessage = '';
      this.timeslot = timeslot;
    }
  }

  public cancelAppointmentChoice(): void {
    this.showPopup = false;
  }

  public async cancelAppointment() {
    await this.appointmentService()
      .cancel(LOCAL_COUNTRY, this.issuer, this.formGroupId, TAKE_APPOINTMENT_ACTION, this.cancelAppointmentComment, this.currentLanguage)
      .catch(error => {
        this.alertService().showError(error);
      });
  }

  public async amendAppointment() {
    getLoadedRecaptchaToken('book', this, this.residenceCountryCode)
      .then(token => {
        // appointment
        this.appointmentService()
          .amend(
            this.issuer,
            this.formGroupId,
            TAKE_APPOINTMENT_ACTION,
            this.timeslot.date + ' ' + this.timeslot.hour,
            this.timeslot.type,
            this.currentLanguage,
            token
          )
          .then(async result => {
            if (result.status === 'success') {
              this.schengenService()
                .cancelTransaction(this.formGroupId)
                .catch();
              // Delete unpaid pta fees only in the shopping cart
              const asyncFun = [];
              _.forEach(this.forms, async form => {
                let sku = '';
                if (_.find(this.currentBasketSku, { f_id: form.f_id, s_sku: PTA_SKU, paid: false })) {
                  sku = PTA_SKU;
                } else if (_.find(this.currentBasketSku, { f_id: form.f_id, s_sku: PTA_WEEKEND_SKU, paid: false })) {
                  sku = PTA_WEEKEND_SKU;
                }
                if (sku !== '') {
                  asyncFun.push(
                    this.schengenService()
                      .deleteFormBasket(form.f_id, `["${sku}"]`)
                      .catch(error => {
                        console.log(error);
                      })
                  );
                }
              });

              Promise.all(asyncFun).then(async () => {
                await this.addPtaAvsToBasket();
                this.showPopup = false;
                this.$router.replace({
                  name: 'Checkout',
                  params: {
                    residenceCountryCode: this.residenceCountryCode,
                    issuer: this.issuer,
                    formGroupId: this.formGroupId.toString()
                  }
                });
              });
            }
          })
          .catch();

        this.invalidCaptcha = false;
      })
      .catch(() => (this.invalidCaptcha = true));
  }

  public async confirmAppointment(): Promise<void> {
    if (this.canGroupAmendAppointment) {
      await this.amendAppointment();
    } else {
      await this.confirmBookAppointment();
    }
  }

  public confirmBookAppointment() {
    return getLoadedRecaptchaToken('book', this, this.residenceCountryCode)
      .then(token => {
        this.invalidCaptcha = false;
        this.book(token);
      })
      .catch(() => (this.invalidCaptcha = true));
  }

  private book(token: string) {
    this.appointmentService()
      .book(
        LOCAL_COUNTRY,
        this.issuer,
        this.formGroupId,
        this.timeslot.date + ' ' + this.timeslot.hour,
        this.timeslot.type,
        this.currentLanguage,
        token
      )
      .then(
        async (res: BookAppointmentResponse) => {
          if (res.status === 'fail') {
            this.showPopup = false;
            // get translation,show popup,if confirm refresh appointment slot
            this.showBookErrorPopup = true;
          } else {
            await this.addPtaAvsToBasket();
            this.showPopup = false;
            let redirect = 'Checkout';
            if (this.afpLockedStatus) {
              redirect = 'CheckoutConfirm';
            }
            this.$router.replace({
              name: redirect,
              params: {
                residenceCountryCode: this.residenceCountryCode,
                issuer: this.issuer,
                formGroupId: this.formGroupId.toString()
              }
            });
          }
        },
        error => {
          this.showPopup = false;
          if (error.response) {
            this.errorMessage = error.response.data.message;
          }
          this.getAvailableAppointments();
        }
      );
  }

  public async removePtaAVStoBasket(): Promise<void> {
    await _.forEach(this.forms, async form => {
      await this.schengenService()
        .deleteFormBasket(form.f_id, `["${PTA_SKU}", "${PTA_WEEKEND_SKU}"]`)
        .catch(error => {
          console.log(error);
        });
    });
  }

  public async addPtaAvsToBasket(): Promise<void> {
    // PTA => need to add AVS for PTA in basket And submit it to the intranet server
    let listForms = [];
    const avsOfForms = [];

    if (this.timeslot.type === APPOINTMENT_TYPE_PTA || this.timeslot.type === APPOINTMENT_TYPE_PTA_WEEKEND) {
      if (this.timeslot.type === APPOINTMENT_TYPE_PTA) {
        listForms = _.map(this.forms, o => _.assignIn({ skus: [this.primeTimeAppointmentAvs.avs.sku] }, o));
        this.forms.forEach(form => {
          avsOfForms.push(new AvsInBasket(this.primeTimeAppointmentAvs, 1, form.f_id, true));
        });
      } else {
        listForms = _.map(this.forms, o => _.assignIn({ skus: [this.primeTimeAppointmentWeekendAvs.avs.sku] }, o));
        this.forms.forEach(form => {
          avsOfForms.push(new AvsInBasket(this.primeTimeAppointmentWeekendAvs, 1, form.f_id, true));
        });
      }
      this.skusByForm = _.values(
        _.mergeWith(_.keyBy(this.skusByForm, 'f_id'), _.keyBy(listForms, 'f_id'), (left, right) => {
          left.skus = _.compact(_.concat(left.skus, right.skus));
          return left;
        })
      );

      this.basketStoreService().replaceBasketWithAvsList(avsOfForms);
      await this.schengenService()
        .addAvsToBasket(this.issuer, this.formGroupId, this.skusByForm)
        .then(() => {})
        .catch(error => {
          this.alertService().showError(error.message);
        });
    }
  }

  public reloadAppointmentSolt(): void {
    this.showPopup = false;
    this.showBookErrorPopup = false;
    this.getAvailableAppointments();
    this.getAvailablePrimeTimeAppointments();
    this.findPtaAvs();
  }

  public getAppointmentToDisplay(): void {
    const from = this.indexAppointment;
    const to = from + 5;
    this.appointmentsToDisplay = this.availableAppointments.slice(from, to);
    this.appointmentsToDisplayPTA = this.availableAppointmentsPTA.slice(from, to);
    this.appointmentsToDisplayWeekendPTA = this.availableAppointmentsWeekendPTA.slice(from, to);
  }

  public getNextAppointment(): void {
    this.indexAppointment++;
    this.indexAppointment = Math.min(this.indexAppointment, this.availableAppointments.length - 5);
    this.getAppointmentToDisplay();
  }

  public getPreviousAppointment(): void {
    this.indexAppointment--;
    this.indexAppointment = Math.max(this.indexAppointment, 0);
    this.getAppointmentToDisplay();
  }

  private appointmentsFilter(appointmentData): any {
    // ads类型预约判断
    if (this.userType === ADS_TYPE && Object.values(appointmentData).every(item => Object.values(item).every(i => i === 0))) {
      this.isShowADSEmptPopup = true;
      return appointmentData;
    }
    // 空预约提示状态 (不包括ads类型)
    if (!Object.values(appointmentData).length) {
      this.emptyBookingControl.push(false);
      return appointmentData;
    }
    if (Object.values(appointmentData).every(item => Object.values(item).every(i => i === 0))) {
      this.emptyBookingControl.push(false);
      return appointmentData;
    }
    const data = {};
    let isStart = false;
    Object.keys(appointmentData).forEach(item => {
      if (Object.values(appointmentData[item]).some(i => i !== 0) || isStart) {
        isStart = true;
        data[item] = appointmentData[item];
      }
    });
    return data;
  }

  private formatAppointments(appointmentData, availableAppointment): void {
    Object.entries(appointmentData).forEach(([date, slots]) => {
      const day = format(new Date(date), 'ccc').toUpperCase();
      const appointment: IAppointment = { date, day };
      appointment.slots = this.formatSlots(slots);
      this[availableAppointment].push(appointment);
    });
    this.getAppointmentToDisplay();
  }

  private formatSlots(slotData): ISlot[] {
    const slots: ISlot[] = [];
    Object.entries(slotData).forEach(([hour, numberAvailable]) => {
      const slot: ISlot = { hour, numberAvailable: +numberAvailable };
      slots.push(slot);
    });
    return slots;
  }

  public getAppointmentPopupContent(): string {
    // Check if the user is reminded to refund the pta fee
    let ptaRefundRemind = '';
    if (
      (this.paidAlreadyPta && this.timeslot.type !== APPOINTMENT_TYPE_PTA) ||
      (this.paidAlreadyPtaWeekend && this.timeslot.type !== APPOINTMENT_TYPE_PTA_WEEKEND)
    ) {
      ptaRefundRemind = _.get(this.applicationAppointmentCMSContent, 'appointment_fee_refund_claim');
    }
    if (this.timeslot.type === APPOINTMENT_TYPE_PTA) {
      return (
        ptaRefundRemind +
        `${_.get(this.applicationAppointmentCMSContent, 'popup_content_pta')} ${_.get(this.primeTimeAppointmentAvs, 'price')}&nbsp` +
        `${_.get(this.primeTimeAppointmentAvs, 'currency.name')} <br/><br/>` +
        `${_.get(this.applicationAppointmentCMSContent, 'popup_content')} ${this.timeslot.date} ${this.timeslot.hour}`
      );
    } else if (this.timeslot.type === APPOINTMENT_TYPE_PTA_WEEKEND) {
      return (
        ptaRefundRemind +
        `${_.get(this.applicationAppointmentCMSContent, 'popup_content_pta_weekend')} ${_.get(
          this.primeTimeAppointmentWeekendAvs,
          'price'
        )}&nbsp` +
        `${_.get(this.primeTimeAppointmentWeekendAvs, 'currency.name')} <br/><br/>` +
        `${_.get(this.applicationAppointmentCMSContent, 'popup_content')} ${this.timeslot.date} ${this.timeslot.hour}`
      );
    } else {
      return (
        ptaRefundRemind + `${_.get(this.applicationAppointmentCMSContent, 'popup_content')} ${this.timeslot.date} ${this.timeslot.hour}`
      );
    }
  }

  public async checkAppointmentCancelInfo(): Promise<void> {
    await this.getApplicationCenterInfoPromise;
    this.schengenService()
      .getFormActions(this.client, this.issuer, this.forms[0].f_id, true)
      .then((res: FormActionDTO[]) => {
        const action = res.reverse().find(item => item.a_what === BOOK_APPOINTMENT_ACTION || item.a_what === TAKE_APPOINTMENT_ACTION);
        if (action.a_tech_deleted) {
          if (action.a_cancel_comment === this.cronJobCancelAppointmentComment || this.appointmentLockDuration === 0) {
            this.showAppointmentTerminationPopup = false;
            this.showAppointmentLockDurationPopup = false;
          } else if (this.appointmentLockDuration === APPOINTMENT_LOCK_DURATION_DEFAULT) {
            this.showAppointmentTerminationPopup = true;
          } else if (this.appointmentLockDuration > 0) {
            const cancelDate = new Date(action.a_when.split(' ')[0]);
            const today = new Date(getToday());
            const duration = this.appointmentLockDuration * 24 * 60 * 60 * 1000;
            if (cancelDate.getTime() + duration > today.getTime()) {
              this.showAppointmentLockDurationPopup = true;
            }
          }
        }
      });
  }

  public goToPersonalPage(): void {
    this.$router.push({
      name: 'Personal',
      params: {
        residenceCountryCode: this.residenceCountryCode,
        issuer: this.issuer,
        formGroupId: this.formGroupId + ''
      }
    });
  }

  public getApplicationCenterInfo() {
    this.getApplicationCenterInfoPromise = this.applicationCenterService().findByIssuer(this.issuer);
    this.getApplicationCenterInfoPromise
      .then(res => {
        this.applicationCenterInfo = res;
        this.appointmentLockDuration = this.applicationCenterInfo.aptLockedDuration;
      })
      .catch(error => {
        this.alertService().showError(error);
      });
  }
}
