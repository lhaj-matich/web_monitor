import { Component, Inject, Vue, Watch } from 'vue-property-decorator';
import DirectusService from '@/core/directus/directus.service';
import LanguageCode from '@/locale/language-code';
import MaintenanceCMSModel from '@/visa-application/models/MaintenanceCMSModel';

@Component
export default class Maintenance extends Vue {
  @Inject('directusService') private directusService: () => DirectusService;
  public currentLanguage: LanguageCode = this.$store.getters.currentLanguage;
  public dataCms: MaintenanceCMSModel = new MaintenanceCMSModel();
  public isShowModel = false;
  @Watch('$store.getters.currentLanguage', { immediate: true, deep: true })
  public onLanguageChange(language: any) {
    this.currentLanguage = language;
    this.getMaintenanceCMS();
  }

  public getMaintenanceCMS(): void {
    this.directusService()
      .getCollection<MaintenanceCMSModel>(
        MaintenanceCMSModel,
        'maintenance',
        ['valid_from', 'valid_until', 'translation.maintenance_notice'],
        null,
        this.currentLanguage
      )
      .then((res: MaintenanceCMSModel[]) => {
        this.dataCms = res[0];
        const startTime = new Date(this.dataCms.valid_from).valueOf();
        const endTime = new Date(this.dataCms.valid_until).valueOf();
        const currentTime = new Date().valueOf();
        if (currentTime < endTime && currentTime > startTime) {
          this.isShowModel = true;
        } else {
          this.isShowModel = false;
        }
      });
  }
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