import * as React from 'react'
import { render } from '@testing-library/react-native'

import { ThemedText } from '../ThemedText'

jest.mock('@/hooks/useThemeColor', () => ({
    useThemeColor: () => '#11181C',
}))

it(`renders correctly`, () => {
    const { toJSON } = render(<ThemedText>Snapshot test!</ThemedText>)
    expect(toJSON()).toMatchSnapshot()
})
