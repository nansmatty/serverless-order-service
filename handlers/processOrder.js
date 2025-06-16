const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({ region: process.env.REGION });

exports.processOrder = async (event) => {
	try {
		console.log(event);

		// Loop through each record in the SQS event
		for (const record of event.Records) {
			const orderData = JSON.parse(record.body);

			const { id, productId, quantity, email, status, createdAt } = orderData;

			await dynamoDBClient.send(
				new PutItemCommand({
					TableName: process.env.ORDER_TABLE,
					Item: {
						id: { S: id },
						productId: { S: productId },
						quantity: { N: quantity.toString() },
						email: { S: email },
						status: { S: status },
						createdAt: { S: createdAt },
					},
				})
			);

			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'Order processed successfully.' }),
			};
		}
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Error processing order', details: error.message }),
		};
	}
};
