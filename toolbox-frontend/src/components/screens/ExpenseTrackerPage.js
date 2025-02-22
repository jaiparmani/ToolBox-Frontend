import React from 'react'
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';
import { Button } from '@mui/material';
import { addExpenseApi } from '../rest/expenseTrackerApis';
import Autocomplete from '@mui/material/Autocomplete';
import DatePickerComponent from '../ReusableComponents/DatePickerComponent';
import FormTextFieldComponent from '../ReusableComponents/FormTextFieldComponent';
import AutocompleteComponent from '../ReusableComponents/AutocompleteComponent';
import SubmitButton from '../ReusableComponents/Buttons/SubmitButton';

export default function ExpenseTrackerPage() {
  const [amount, setAmount] = React.useState();
  const [description, setDescription] = React.useState();
  const [category, setCategory] = React.useState();
  const [date, setDate] = React.useState();
  const addExpense = () => {
    console.log(date)
    console.log('amount', amount)
    console.log('category', category)
    console.log('description', description)
    addExpenseApi('user', amount, category, date, description, (data) => {}, (error) => {});
  }
  const top100Films = [
    { label: 'The Shawshank Redemption', id: 1994 },
    { label: 'The Godfather', id: 1972 },
    { label: 'The Godfather: Part II', id: 1974 },]
  return (
    <Box >
      <FormControl sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100vh', alignContent: 'space-between'  }} variant="outlined">
        <FormTextFieldComponent category="Amount" value={amount} onChange={setAmount}/>
        <AutocompleteComponent options={top100Films} label="Category" onChange={setCategory}/>
        <FormTextFieldComponent category="Description" value={description} onChange={setDescription}/>
        <DatePickerComponent value={date} onChange={setDate}/>
        <SubmitButton onClick={()=>{addExpense()}} />
                  <Button onClick={addExpense}>submit</Button>
          
      </FormControl>
      </Box>

  )
}
