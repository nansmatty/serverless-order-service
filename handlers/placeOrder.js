const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const axios = require('axios');
const { v4 } = require('uuid');

const dynamoDBClient = new DynamoDBClient({ region: process.env.REGION });

exports.placeOrder = async (event) => {
	try {
		const tableName = process.env.ORDER_TABLE;

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

		// Place the order
		const putItemCommand = new PutItemCommand({
			TableName: tableName,
			Item: {
				id: { S: v4() },
				productId: { S: id },
				quantity: { N: quantity.toString() },
				email: { S: email },
				status: { S: 'PENDING' },
				createdAt: { S: new Date().toISOString() },
			},
		});

		await dynamoDBClient.send(putItemCommand);

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
