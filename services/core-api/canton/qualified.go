package canton

import (
	"os"
	"strings"
)

// PackageIDFromEnv returns the deployed Daml package hash for Seaport DevNet.
func PackageIDFromEnv() string {
	return strings.TrimSpace(os.Getenv("CANTON_DAML_PACKAGE_ID"))
}

// QualifyTemplateID prefixes package-qualified template ids for ledger filters.
func QualifyTemplateID(packageID, templateID string) string {
	packageID = strings.TrimSpace(packageID)
	templateID = strings.TrimSpace(templateID)

	if packageID == "" || strings.Contains(templateID, packageID+":") {
		return templateID
	}

	if strings.Count(templateID, ":") >= 2 {
		return templateID
	}

	return packageID + ":" + templateID
}
