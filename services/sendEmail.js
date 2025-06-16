const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.REGION });

exports.sendOrderEmail = async (toEmail, orderId, productName, quantity, content) => {
	const emailParams = {
		Source: process.env.EMAIL_IDENTITY, // Replace with your verified SES email
		Destination: {
			ToAddresses: [toEmail],
		},
		Message: {
			Subject: {
				Data: 'Order Confirmation',
			},
			Body: {
				Text: {
					Data: `Thank you for your order! Your order ID is ${orderId}. You ordered ${quantity} ${productName}.\n We will process it shortly.\n ${content}`,
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
