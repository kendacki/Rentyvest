package canton

import "log"

// ledgerLog emits structured, grep-friendly ledger observability lines.
func ledgerLog(component, operation, detail string) {
	log.Printf("[ledger][%s] op=%s %s", component, operation, detail)
}

func ledgerLogErr(component, operation, detail string, err error) {
	if err == nil {
		ledgerLog(component, operation, detail)
		return
	}
	log.Printf("[ledger][%s] op=%s %s err=%v", component, operation, detail, err)
}
