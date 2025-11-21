use candle_transformers::models::segment_anything::sam;
use wasm_bindgen::prelude::*;

pub use sam::{Sam, IMAGE_SIZE};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
}

#[macro_export]
macro_rules! console_log {
    ($($t:tt)*) => ($crate::log(&format_args!($($t)*).to_string()))
}
