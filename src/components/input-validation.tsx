import type { InputHTMLAttributes } from 'react'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import { useFormContext, Controller } from 'react-hook-form'

export interface InputFormValidationsProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string
  placeholder: string
  label: string
  index?: number
  callback?: () => {}
}

export function InputFormValidations({
  name,
  placeholder,
  label,
  index,
  ...rest
}: InputFormValidationsProps) {
  const { control, setValue } = useFormContext()

  function handleChange(text: string | number) {
    setValue(name, text)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (index) {
      if (event.key === 'Enter') {
        const nextInput = event.currentTarget.form?.elements[
          index
        ] as HTMLInputElement | null
        if (nextInput) {
          nextInput.focus()
        }
      }
    }
  }

  return (
    <Controller
      name={name}
      control={control}
      render={() => (
        <FormField
          name={name}
          render={({ field: field2 }) => (
            <FormItem>
              {label && <FormLabel>{label}</FormLabel>}
              <FormControl>
                <Input
                  onKeyPress={(e) => handleKeyDown(e)}
                  placeholder={placeholder}
                  {...field2}
                  {...rest}
                  onChange={(e) => {
                    const value: string | number =
                      rest.type === 'number'
                        ? parseFloat(e.target.value)
                        : e.target.value
                    handleChange(value)
                    if (rest.onChange) {
                      rest.onChange(e)
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    />
  )
}
