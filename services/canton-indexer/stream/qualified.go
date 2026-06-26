package stream

import (
	"os"
	"strings"
)

func packageIDFromEnv() string {
	return strings.TrimSpace(os.Getenv("CANTON_DAML_PACKAGE_ID"))
}

func qualifyTemplateID(packageID, templateID string) string {
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
