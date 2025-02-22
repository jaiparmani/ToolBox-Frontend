import React from 'react'
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';
import { Button } from '@mui/material';

export default function ExpenseTrackerPage() {
  const [amount, setAmount] = React.useState();
  const [description, setDescription] = React.useState();
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>

    <FormControl sx={{ m: 1, width: '25ch' }} variant="outlined">
        <FormHelperText id="outlined-weight-helper-text">Amount</FormHelperText>
          <OutlinedInput
            id="outlined-adornment-weight"
            startAdornment={<InputAdornment position="end">Rs </InputAdornment>}
            aria-describedby="outlined-weight-helper-text"
            inputProps={{
              'aria-label': 'weight',
            }}
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
          />

        <FormHelperText id="outlined-weight-helper-text">Description</FormHelperText>
          <OutlinedInput
            id="outlined-adornment-weight"
            aria-describedby="outlined-weight-helper-text"
            inputProps={{
              'aria-label': 'weight',
            }}
            value={amount}
            onChange={(e)=>setAmount(e.target.value)}
          />


      </FormControl>
      <Button onClick={()=>alert(amount)} >submit</Button>
      </Box>

  )
}
