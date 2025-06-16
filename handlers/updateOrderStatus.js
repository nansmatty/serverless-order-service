const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({ region: process.env.REGION });

exports.updateOrderStatus = async (event) => {
	try {
		console.log('Event received:', event);

		const { id, email, quantity, product } = event;

		await dynamoDBClient.send(
			new UpdateItemCommand({
				TableName: process.env.ORDER_TABLE,
				Key: {
					id: { S: id },
				},
				UpdateExpression: 'SET #status = :newStatus',
				ExpressionAttributeNames: {
					'#status': 'status',
				},
				ExpressionAttributeValues: {
					':newStatus': { S: 'SHIPPING' },
				},
			})
		);

		// Send the order confirmation email to the user using AWS SES
		await sendOrderEmail(email, id, product.productName?.S || 'unknown product', quantity, 'Your order is shipped now.');

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Order status updated successfully.' }),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Error updating order status', details: error.message }),
		};
	}
};
