import sgMail from '@sendgrid/mail';
import { ENV } from './env';

if (ENV.SENDGRID_API_KEY) {
  sgMail.setApiKey(ENV.SENDGRID_API_KEY);
} else {
  // eslint-disable-next-line no-console
  console.warn('SENDGRID_API_KEY is not set; email sending will be disabled.');
}

export default sgMail;
