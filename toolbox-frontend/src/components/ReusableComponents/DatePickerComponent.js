import React from 'react'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MultiInputDateRangeField } from '@mui/x-date-pickers-pro/MultiInputDateRangeField';
import { SingleInputDateRangeField } from '@mui/x-date-pickers-pro/SingleInputDateRangeField';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

export default function DatePickerComponent({value, onChange}) {
  // Convert native Date object to dayjs object for Material-UI compatibility
  const dayjsValue = value ? dayjs(value) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DemoContainer
        components={['MultiInputDateRangeField', 'SingleInputDateRangeField']}
      >
        <DatePicker
          label="Basic date picker"
          value={dayjsValue}
          onChange={(newValue) => {
            // Convert dayjs back to native Date for the parent component
            onChange(newValue ? newValue.toDate() : null);
          }}
        />
      </DemoContainer>
    </LocalizationProvider>
  )
}
