// Primary: Patrick Rutkowski (patrick@geomagical.com)

export const OR = false
export const AND = true

//
// These AND and OR constants are in the spirit of Lisp's `(or a
// b c)` and `(and a b c)` constructs. They make multi-line
// logical constructs align better in C-style languages. For
// example:
//
// No alignment:
//
// if( ! stackableItem?.plane.parameters
//     || ! stackableItem?.renderObject )
//
//
// Aligned, the "||" is harder to see:
//
// if( ! stackableItem?.plane.parameters ||
//     ! stackableItem?.renderObject )
//
//
// Aligned, but with an odd gap:
//
// if(    ! stackableItem?.plane.parameters
//     || ! stackableItem?.renderObject )
//
//
// Just right:
//
// if( OR
//     || ! stackableItem?.plane.parameters
//     || ! stackableItem?.renderObject )
//
