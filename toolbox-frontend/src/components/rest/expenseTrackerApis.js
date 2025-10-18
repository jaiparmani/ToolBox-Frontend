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

export const getArraySumApi = (values, onSuccess, onError) => {

     const queryString = values.join(',');
     const url = `https://jaiparmani.pythonanywhere.com/api/tools/array-sum/?values=${encodeURIComponent(queryString)}`;

     fetch(url, {
         method: 'GET',
         headers: {
             'Content-Type': 'application/json',
         },
     })
     .then(response => response.json())
     .then(data => {
         console.log('Array sum success:', data);
         onSuccess(data);
     })
     .catch((error) => {
         console.error('Array sum error:', error);
         onError(error);
     });

 }