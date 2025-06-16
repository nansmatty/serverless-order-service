const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.REGION });

exports.sendOrderEmail = async (toEmail, orderId, productName, quantity) => {
	const emailParams = {
		Source: 'nodereactaws@gmail.com', // Replace with your verified SES email
		Destination: {
			ToAddresses: [toEmail],
		},
		Message: {
			Subject: {
				Data: 'Order Confirmation',
			},
			Body: {
				Text: {
					Data: `Thank you for your order! Your order ID is ${orderId}. You ordered ${quantity} ${productName}. We will process it shortly.\n We will notify you once your order is shipped.`,
				},
			},
		},
	};

	try {
		const command = new SendEmailCommand(emailParams);
		await sesClient.send(command);
	} catch (error) {
		throw new Error('Error sending email failed: ' + error.message);
	}
};
