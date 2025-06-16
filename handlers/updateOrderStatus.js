const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({ region: process.env.REGION });

exports.updateOrderStatus = async (event) => {
	try {
		console.log('Event received:', event);

		const { id } = event;

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
					':newStatus': { S: 'PROCESSING' },
				},
			})
		);

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
