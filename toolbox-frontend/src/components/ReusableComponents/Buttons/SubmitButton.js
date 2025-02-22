import { Button } from '@mui/material'
import React from 'react'

export default function SubmitButton({onSub}) {
  return (
    <div>
        <Button onClick={onSub}>submit</Button>
    </div>
  )
}
