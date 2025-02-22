export const addExpenseApi = (user, amount, category, date, description, onSuccess, onError ) => {

    fetch('http://localhost:5000/addExpense', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({user, amount, category, description, date}),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        onSuccess(data);
    })
    .catch((error) => {
        console.error('Error:', error);
        onError(error);
    });

}