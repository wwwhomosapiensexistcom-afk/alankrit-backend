import sgMail from '../config/sendgrid';
import { ENV } from '../config/env';

const FROM_EMAIL = ENV.SENDGRID_FROM_EMAIL;
const FROM_NAME = ENV.SENDGRID_FROM_NAME;

export interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
	if (!ENV.SENDGRID_API_KEY) {
		// Email disabled; fail silently in non-configured environments
		return;
	}

	try {
		await sgMail.send({
			from: { email: FROM_EMAIL, name: FROM_NAME },
			to: options.to,
			subject: options.subject,
			html: options.html,
			text: options.text ?? options.html.replace(/<[^>]*>/g, ''),
		});
		// eslint-disable-next-line no-console
		console.log(`Email sent to ${options.to}: ${options.subject}`);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('SendGrid error:', error);
		throw new Error('Failed to send email');
	}
}

export async function sendOrderConfirmation(
	customerEmail: string,
	customerName: string,
	orderNumber: string,
	orderTotal: number,
	orderItems: Array<{ name: string; quantity: number; price: number }>,
): Promise<void> {
	const itemsHtml = orderItems
		.map(
			(item) =>
				`<tr>
  <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(
					2,
				)}</td>
</tr>`,
		)
		.join('');

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #f4f4f4; padding: 20px; text-align: center;">
    <h1 style="margin: 0; color: #1a1a1a;">Alankrit by RAK</h1>
  </div>

  <div style="padding: 20px;">
    <h2>Thank You for Your Order!</h2>
    <p>Hi ${customerName},</p>
    <p>We've received your order and are preparing it for shipment. Here are your order details:</p>

    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Order Total:</strong> ₹${orderTotal.toFixed(2)}</p>
    </div>

    <h3>Order Items:</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f4f4f4;">
          <th style="padding: 10px; text-align: left;">Product</th>
          <th style="padding: 10px; text-align: center;">Qty</th>
          <th style="padding: 10px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <p>You'll receive another email when your order ships with tracking information.</p>

    <p>If you have any questions, please contact us at support@alankrit.com</p>

    <p>Thank you for choosing Alankrit by RAK!</p>
  </div>

  <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>&copy; 2025 AuRAKi Jewelry. All rights reserved.</p>
  </div>
</body>
</html>
`;

	await sendEmail({
		to: customerEmail,
		subject: `Order Confirmation - ${orderNumber}`,
		html,
	});
}

export async function sendOrderStatusUpdate(
	customerEmail: string,
	customerName: string,
	orderNumber: string,
	status: string,
	trackingNumber?: string,
): Promise<void> {
	let statusMessage = '';
	let statusColor = '#333';

	switch (status) {
		case 'Processing':
			statusMessage = 'Your order is being processed';
			statusColor = '#f59e0b';
			break;
		case 'Shipped':
			statusMessage = 'Your order has been shipped!';
			statusColor = '#3b82f6';
			break;
		case 'Delivered':
			statusMessage = 'Your order has been delivered';
			statusColor = '#10b981';
			break;
		default:
			statusMessage = `Order status: ${status}`;
	}

	const trackingHtml = trackingNumber
		? `
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
      <p>You can track your shipment using this number.</p>
    </div>
  `
		: '';

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Order Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #f4f4f4; padding: 20px; text-align: center;">
    <h1 style="margin: 0; color: #1a1a1a;">AuRAKi Jewelry</h1>
  </div>

  <div style="padding: 20px;">
    <h2 style="color: ${statusColor};">${statusMessage}</h2>
    <p>Hi ${customerName},</p>
    <p>Your order <strong>${orderNumber}</strong> status has been updated.</p>

    ${trackingHtml}

    <p>Thank you for your patience!</p>

    <p>Best regards,<br />Alankrit Team</p>
  </div>

  <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>&copy; 2025 Alankrit by RAK. All rights reserved.</p>
  </div>
</body>
</html>
`;

	await sendEmail({
		to: customerEmail,
		subject: `Order Update - ${orderNumber}`,
		html,
	});
}

export async function sendLowStockAlert(
	productName: string,
	sku: string,
	currentStock: number,
	reorderPoint: number,
): Promise<void> {
	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Low Stock Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #ef4444; padding: 20px; text-align: center;">
    <h1 style="margin: 0; color: white;">Low Stock Alert</h1>
  </div>

  <div style="padding: 20px;">
    <p><strong>Warning:</strong> The following product is running low on stock:</p>

    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <p><strong>Product:</strong> ${productName}</p>
      <p><strong>SKU:</strong> ${sku}</p>
      <p><strong>Current Stock:</strong> ${currentStock} units</p>
      <p><strong>Reorder Point:</strong> ${reorderPoint} units</p>
    </div>

    <p>Please restock this product soon to avoid running out.</p>

    <a href="http://localhost:3000/admin/inventory" style="display: inline-block; padding: 10px 20px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
      View Inventory
    </a>
  </div>
</body>
</html>
`;

	await sendEmail({
		to: 'admin@alankrit.com',
		subject: `Low Stock Alert: ${productName}`,
		html,
	});
}
