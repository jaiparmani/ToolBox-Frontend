import React from 'react'
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export default function AutocompleteComponent({options, label, onChange}) {
  return (
    <Autocomplete
    disablePortal
    options={options}
    onChange={(e, value)=>{
        console.log(value)
        onChange(value.id)}}
    sx={{ width: 300 }}
    renderInput={(params) => <TextField {...params}  label={label} />}
  />  )
}
