const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const axios = require('axios');
const { v4 } = require('uuid');

const dynamoDBClient = new DynamoDBClient({ region: process.env.REGION });
const sqsClient = new SQSClient({ region: process.env.REGION });

exports.placeOrder = async (event) => {
	try {
		const tableName = process.env.ORDER_TABLE;
		const orderQueueUrl = process.env.ORDER_QUEUE_URL;

		const { id, quantity, email } = JSON.parse(event.body);
		if (!id || !quantity || !email) {
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
