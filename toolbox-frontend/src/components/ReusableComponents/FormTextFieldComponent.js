import React from 'react'
import OutlinedInput from '@mui/material/OutlinedInput';

import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';
export default function FormTextFieldComponent({category, value, onChange}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', margin: '10px'}}>
    <FormHelperText id="outlined-weight-helper-date">{category}</FormHelperText>
    <OutlinedInput
            id="outlined-adornment-weight"
            aria-describedby="outlined-weight-helper-text"
            inputProps={{
              'aria-label': 'weight',
            }}
            value={value}
            onChange={(e)=>onChange(e.target.value)}
          />
    </div>
  )
}
