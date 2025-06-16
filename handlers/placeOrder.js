const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const axios = require('axios');
const { v4 } = require('uuid');
const { sendOrderEmail } = require('../services/sendEmail');

const sqsClient = new SQSClient({ region: process.env.REGION });
const sfnClient = new SFNClient({ region: process.env.REGION });

exports.placeOrder = async (event) => {
	try {
		const orderQueueUrl = process.env.ORDER_QUEUE_URL;

		const email = event.requestContext.authorizer.jwt.claims.email;

		if (!email) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: 'Unauthorized!' }),
			};
		}

		const { id, quantity } = JSON.parse(event.body);
		if (!id || !quantity) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Missing required fields.' }),
			};
		}

		// Validate product ID and quantity
		const productResponse = await axios.get(`https://ajxpkq8y1e.execute-api.ap-southeast-1.amazonaws.com/products`);

		// Extract aprroved products from the API response
		const approvedProducts = productResponse.data.products || [];

		const product = approvedProducts.find((p) => p.id?.S === id);

		if (!product) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Invalid product.' }),
			};
		}

		const availableStock = parseInt(product.quantity?.N || '0');

		if (availableStock < quantity) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Insufficient stock available.' }),
			};
		}

		// Send message to SQS queue
		const orderId = v4();

		// Create the order payload
		const payload = {
			id: orderId,
			productId: id,
			quantity,
			email,
			status: 'PENDING',
			createdAt: new Date().toISOString(),
		};

		// Send the order to SQS
		const sendMessageCommand = new SendMessageCommand({
			QueueUrl: orderQueueUrl,
			MessageBody: JSON.stringify(payload),
		});

		await sqsClient.send(sendMessageCommand);

		// This will tell AWS to start running the Step Function(state machine) using the order payload
		const startExecutionCommand = new StartExecutionCommand({
			stateMachineArn: process.env.STEP_FUNCTION_ARN,
			input: JSON.stringify({ ...payload }),
		});

		// Send the order confirmation email to the user using AWS SES
		await sendOrderEmail(email, orderId, product.productName?.S || 'unknown product', quantity);

		await sfnClient.send(startExecutionCommand);

		return {
			statusCode: 201,
			body: JSON.stringify({ message: 'Order placed successfully.' }),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Error placing order', details: error.message }),
		};
	}
};
