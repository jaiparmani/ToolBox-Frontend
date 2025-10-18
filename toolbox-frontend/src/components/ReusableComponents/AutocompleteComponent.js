import React from 'react'
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export default function AutocompleteComponent({options, label, value, onChange, multiple = false}) {
  return (
    <Autocomplete
      disablePortal
      options={options}
      value={multiple ?
        options.filter(option => value?.includes(option.id)) :
        options.find(option => option.id === value) || null
      }
      onChange={(e, newValue) => {
        if (multiple) {
          onChange(newValue?.map(item => item.id) || []);
        } else {
          onChange(newValue?.id || '');
        }
      }}
      sx={{ width: 300 }}
      renderInput={(params) => <TextField {...params} label={label} />}
      multiple={multiple}
    />
  )
}
