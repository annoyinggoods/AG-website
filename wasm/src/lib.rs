use serde::Serialize;
use wasm_bindgen::prelude::*;

// The JSON contract with the TypeScript side is written down in REVIEW/audit/chart-boundary.md.

const MAX_INPUT_CHARS: usize = 200_000;
const MAX_WORD_LEN: usize = 200;
const TOP_TERMS: usize = 10;
const BUILD_STAMP: &str = "ag-text-stats 0.1.0";

#[derive(Serialize)]
struct TermCount {
    term: String,
    count: usize,
}

#[derive(Serialize)]
struct Analysis {
    chars: usize,
    words: usize,
    sentences: usize,
    unique: usize,
    avg_word_len: f64,
    avg_sentence_len: f64,
    top_terms: Vec<TermCount>,
}

#[derive(Serialize)]
struct Series {
    buckets: Vec<usize>,
    labels: Vec<String>,
    peak: usize,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
    code: String,
}

fn err_json(code: &str, message: &str) -> String {
    let body = ErrorBody {
        error: message.to_string(),
        code: code.to_string(),
    };
    serde_json::to_string(&body).unwrap_or_else(|_| "{\"error\":\"encoding failed\",\"code\":\"encode_error\"}".to_string())
}

fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric() || ch == '\'' || ch == '-'
}

fn tokenize(text: &str) -> Vec<String> {
    let mut terms: Vec<String> = Vec::new();
    let mut current = String::new();
    for ch in text.chars() {
        if is_word_char(ch) {
            if current.len() < MAX_WORD_LEN {
                for lower in ch.to_lowercase() {
                    current.push(lower);
                }
            }
            continue;
        }
        push_term(&mut terms, &mut current);
    }
    push_term(&mut terms, &mut current);
    terms
}

fn push_term(terms: &mut Vec<String>, current: &mut String) {
    let trimmed = current.trim_matches(|c| c == '\'' || c == '-');
    if has_letter(trimmed) {
        terms.push(trimmed.to_string());
    }
    current.clear();
}

fn has_letter(term: &str) -> bool {
    for ch in term.chars() {
        if ch.is_alphabetic() {
            return true;
        }
    }
    false
}

fn count_sentences(text: &str) -> usize {
    let mut count = 0;
    let mut in_run = false;
    let mut has_word = false;
    for ch in text.chars() {
        if ch.is_alphabetic() {
            has_word = true;
        }
        if ch == '.' || ch == '!' || ch == '?' {
            if !in_run && has_word {
                count += 1;
            }
            in_run = true;
            continue;
        }
        in_run = false;
    }
    if has_word && count == 0 {
        return 1;
    }
    count
}

fn top_terms(terms: &[String]) -> Vec<TermCount> {
    let mut pairs: Vec<(String, usize)> = Vec::new();
    for term in terms {
        let found = find_pair(&mut pairs, term);
        if !found {
            pairs.push((term.clone(), 1));
        }
    }
    sort_pairs(&mut pairs);
    let mut out: Vec<TermCount> = Vec::new();
    for (term, count) in pairs.into_iter().take(TOP_TERMS) {
        out.push(TermCount { term, count });
    }
    out
}

fn find_pair(pairs: &mut Vec<(String, usize)>, term: &str) -> bool {
    for pair in pairs.iter_mut() {
        if pair.0 == term {
            pair.1 += 1;
            return true;
        }
    }
    false
}

fn sort_pairs(pairs: &mut Vec<(String, usize)>) {
    let mut i = 1;
    while i < pairs.len() {
        let mut j = i;
        while j > 0 && rank_pair(&pairs[j], &pairs[j - 1]) {
            pairs.swap(j, j - 1);
            j -= 1;
        }
        i += 1;
    }
}

fn rank_pair(next: &(String, usize), prev: &(String, usize)) -> bool {
    if next.1 != prev.1 {
        return next.1 > prev.1;
    }
    next.0 < prev.0
}

fn analyze_inner(text: &str) -> Result<Analysis, ErrorBody> {
    if text.chars().count() > MAX_INPUT_CHARS {
        return Err(ErrorBody {
            error: "Text exceeds the 200,000 character demo limit. Please paste a shorter passage.".to_string(),
            code: "oversize_input".to_string(),
        });
    }
    let terms = tokenize(text);
    if terms.is_empty() {
        return Err(ErrorBody {
            error: "No words found. Paste text or load the sample before analyzing.".to_string(),
            code: "empty_input".to_string(),
        });
    }
    let mut unique_terms: Vec<String> = Vec::new();
    for term in &terms {
        if !unique_terms.contains(term) {
            unique_terms.push(term.clone());
        }
    }
    let total_len: usize = terms.iter().map(|t| t.chars().count()).sum();
    let words = terms.len();
    let sentences = count_sentences(text);
    let analysis = Analysis {
        chars: text.chars().count(),
        words,
        sentences,
        unique: unique_terms.len(),
        avg_word_len: round1(total_len as f64 / words as f64),
        avg_sentence_len: round1(words as f64 / sentences.max(1) as f64),
        top_terms: top_terms(&terms),
    };
    Ok(analysis)
}

fn round1(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

fn series_inner(text: &str) -> Result<Series, ErrorBody> {
    if text.chars().count() > MAX_INPUT_CHARS {
        return Err(ErrorBody {
            error: "Text exceeds the 200,000 character demo limit. Please paste a shorter passage.".to_string(),
            code: "oversize_input".to_string(),
        });
    }
    let terms = tokenize(text);
    if terms.is_empty() {
        return Err(ErrorBody {
            error: "No words found. Paste text or load the sample before charting.".to_string(),
            code: "empty_input".to_string(),
        });
    }
    let counts = top_terms(&terms);
    let mut buckets: Vec<usize> = Vec::new();
    let mut labels: Vec<String> = Vec::new();
    let mut peak = 0;
    for entry in counts.iter().take(TOP_TERMS) {
        buckets.push(entry.count);
        labels.push(entry.term.clone());
        if entry.count > peak {
            peak = entry.count;
        }
    }
    Ok(Series {
        buckets,
        labels,
        peak,
    })
}

#[wasm_bindgen]
pub fn analyze_text(text: &str) -> String {
    match analyze_inner(text) {
        Ok(analysis) => serde_json::to_string(&analysis)
            .unwrap_or_else(|_| err_json("encode_error", "Analysis finished but encoding failed.")),
        Err(body) => serde_json::to_string(&body)
            .unwrap_or_else(|_| err_json("encode_error", "Analysis failed and encoding failed.")),
    }
}

#[wasm_bindgen]
pub fn chart_series(text: &str) -> String {
    match series_inner(text) {
        Ok(series) => serde_json::to_string(&series)
            .unwrap_or_else(|_| err_json("encode_error", "Chart finished but encoding failed.")),
        Err(body) => serde_json::to_string(&body)
            .unwrap_or_else(|_| err_json("encode_error", "Chart failed and encoding failed.")),
    }
}

#[wasm_bindgen]
pub fn version() -> String {
    BUILD_STAMP.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn decode_analysis(json: &str) -> serde_json::Value {
        serde_json::from_str(json).expect("analysis json decodes")
    }

    #[test]
    fn empty_input_returns_typed_error() {
        let json = analyze_text("");
        let value = decode_analysis(&json);
        assert_eq!(value["code"], "empty_input");
        assert_eq!(value["error"].as_str().unwrap().len() > 0, true);
    }

    #[test]
    fn punctuation_only_returns_empty_error() {
        let json = analyze_text("... !!! ??? --- '''");
        let value = decode_analysis(&json);
        assert_eq!(value["code"], "empty_input");
    }

    #[test]
    fn mixed_polish_and_english_diacritics_tokenize() {
        let json = analyze_text("Zażółć gęślą jaźń spider web ŻÓŁW spider.");
        let value = decode_analysis(&json);
        assert_eq!(value["words"], 7);
        assert_eq!(value["sentences"], 1);
        let terms = value["top_terms"].as_array().expect("top terms array");
        assert_eq!(terms[0]["term"], "spider");
        assert_eq!(terms[0]["count"], 2);
    }

    #[test]
    fn very_long_words_are_capped_not_lost() {
        let mut long_word = String::new();
        for _ in 0..400 {
            long_word.push('a');
        }
        let text = long_word.clone() + " spider";
        let json = analyze_text(&text);
        let value = decode_analysis(&json);
        assert_eq!(value["words"], 2);
        let terms = value["top_terms"].as_array().expect("top terms array");
        assert_eq!(terms.len(), 2);
    }

    #[test]
    fn oversize_input_returns_typed_error() {
        let mut big = String::new();
        for _ in 0..(MAX_INPUT_CHARS + 10) {
            big.push('w');
        }
        let json = analyze_text(&big);
        let value = decode_analysis(&json);
        assert_eq!(value["code"], "oversize_input");
        let chart = chart_series(&big);
        let chart_value: serde_json::Value = serde_json::from_str(&chart).expect("chart json decodes");
        assert_eq!(chart_value["code"], "oversize_input");
    }

    #[test]
    fn chart_series_buckets_top_terms() {
        let chart = chart_series("spider spider web silk spider web thread");
        let value: serde_json::Value = serde_json::from_str(&chart).expect("chart json decodes");
        assert_eq!(value["labels"][0], "spider");
        assert_eq!(value["buckets"][0], 3);
        assert_eq!(value["peak"], 3);
    }

    #[test]
    fn version_reports_build_stamp() {
        assert_eq!(version(), BUILD_STAMP);
    }
}
